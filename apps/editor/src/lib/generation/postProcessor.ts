import sharp from 'sharp';

import type {
  ProcessedGenerationResult,
  RawGenerationResult,
  TileSize,
} from '@packages/types';

import type { GenerationOutputContract } from './outputContract';
import { quantiseRgba } from './paletteQuantiser';
import {
  type AutotileSide,
  type PathAutotileLayout,
} from './pathAutotileLayout';

export const SELF_TILING_PASS_THRESHOLD = 0.92;
const BACKGROUND_DISTANCE_THRESHOLD = 36;

function pixelOffset(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

function rgbDistance(
  left: Uint8Array | Buffer,
  leftOffset: number,
  right: Uint8Array | Buffer,
  rightOffset: number,
): number {
  return (
    Math.abs(left[leftOffset] - right[rightOffset])
    + Math.abs(left[leftOffset + 1] - right[rightOffset + 1])
    + Math.abs(left[leftOffset + 2] - right[rightOffset + 2])
  ) / 3;
}

function similarityFromMad(mad: number): number {
  return 1 - Math.min(1, mad / 255);
}

/**
 * - `nearest`: keeps one source pixel per output pixel (historical behaviour;
 *   aliases badly when the source is far larger than the tile).
 * - `lanczos`: smooth area-style resampling.
 * - `block-mode`: each output pixel takes the dominant colour of the source
 *   block it covers (pixel-art friendly, no blending between tones).
 */
export const DOWNSCALE_STRATEGIES = ['nearest', 'lanczos', 'block-mode'] as const;
export type DownscaleStrategy = typeof DOWNSCALE_STRATEGIES[number];

/**
 * - `sharp`: sharp's PNG palette mode. `colours` is only honoured up to a bit
 *   depth, so anything from 17 to 256 keeps up to 256 colours.
 * - `median-cut`: exact palette of at most `colours` colours.
 */
export const PALETTE_QUANTISERS = ['sharp', 'median-cut'] as const;
export type PaletteQuantiser = typeof PALETTE_QUANTISERS[number];

export interface PostProcessOptions {
  downscale: DownscaleStrategy;
  quantiser: PaletteQuantiser;
  /** Requested palette size of the stored PNG. */
  colours: number;
  /** Centred share of the raw image kept before resizing (1 = everything). */
  cropFraction: number;
}

/** Behaviour of the production pipeline; the lab compares variants to it. */
export const BASELINE_POST_PROCESS: PostProcessOptions = {
  downscale: 'nearest',
  quantiser: 'sharp',
  colours: 32,
  cropFraction: 1,
};

async function cropToAspect(
  input: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  aspect: number,
  cropFraction: number,
): Promise<Buffer> {
  const fraction = Math.min(1, Math.max(cropFraction, 0.05));
  const fullWidth = Math.min(sourceWidth, Math.round(sourceHeight * aspect));
  const fullHeight = Math.min(sourceHeight, Math.round(sourceWidth / aspect));
  const cropWidth = Math.max(1, Math.round(fullWidth * fraction));
  const cropHeight = Math.max(1, Math.round(fullHeight * fraction));
  if (cropWidth === sourceWidth && cropHeight === sourceHeight) {
    return input;
  }
  return sharp(input)
    .extract({
      left: Math.floor((sourceWidth - cropWidth) / 2),
      top: Math.floor((sourceHeight - cropHeight) / 2),
      width: cropWidth,
      height: cropHeight,
    })
    .toBuffer();
}

/** Bins colours to 4 bits per channel so anti-aliasing fuzz votes together. */
function voteKey(red: number, green: number, blue: number): number {
  return ((red >> 4) << 8) | ((green >> 4) << 4) | (blue >> 4);
}

async function blockModeDownscale(
  source: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = Buffer.alloc(width * height * 4);

  for (let ty = 0; ty < height; ty += 1) {
    const y0 = Math.floor((ty * info.height) / height);
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * info.height) / height));
    for (let tx = 0; tx < width; tx += 1) {
      const x0 = Math.floor((tx * info.width) / width);
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * info.width) / width));
      const bins = new Map<number, { count: number; red: number; green: number; blue: number }>();
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const offset = pixelOffset(x, y, info.width);
          const key = voteKey(data[offset], data[offset + 1], data[offset + 2]);
          const bin = bins.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
          bin.count += 1;
          bin.red += data[offset];
          bin.green += data[offset + 1];
          bin.blue += data[offset + 2];
          bins.set(key, bin);
        }
      }
      let bestKey = -1;
      let best = { count: 0, red: 0, green: 0, blue: 0 };
      for (const [key, bin] of bins) {
        if (bin.count > best.count || (bin.count === best.count && key < bestKey)) {
          bestKey = key;
          best = bin;
        }
      }
      const target = pixelOffset(tx, ty, width);
      output[target] = Math.round(best.red / best.count);
      output[target + 1] = Math.round(best.green / best.count);
      output[target + 2] = Math.round(best.blue / best.count);
      output[target + 3] = 255;
    }
  }

  return sharp(output, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function encodePalette(
  image: Buffer,
  options: PostProcessOptions,
): Promise<Buffer> {
  if (options.quantiser === 'sharp') {
    return sharp(image)
      .png({ palette: true, colours: options.colours, dither: 0 })
      .toBuffer();
  }
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return sharp(quantiseRgba(data, options.colours), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ palette: true, colours: 256, dither: 0 })
    .toBuffer();
}

async function fitCanonicalImage(
  imageBytes: Uint8Array,
  width: number,
  height: number,
  minimumSource: number,
  options: PostProcessOptions,
): Promise<Buffer> {
  const input = Buffer.from(imageBytes);
  const metadata = await sharp(input).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Generated image has invalid dimensions');
  }
  if (metadata.width < minimumSource || metadata.height < minimumSource) {
    throw new Error('Generated image is too small for the project tile size');
  }

  const source = await cropToAspect(
    input,
    metadata.width,
    metadata.height,
    width / height,
    options.cropFraction,
  );

  switch (options.downscale) {
    case 'block-mode':
      return encodePalette(await blockModeDownscale(source, width, height), options);
    case 'nearest':
    case 'lanczos':
      return encodePalette(
        await sharp(source)
          .resize(width, height, {
            fit: 'cover',
            position: 'centre',
            kernel: options.downscale === 'nearest'
              ? sharp.kernel.nearest
              : sharp.kernel.lanczos3,
          })
          .png()
          .toBuffer(),
        options,
      );
    default: {
      const exhaustive: never = options.downscale;
      return exhaustive;
    }
  }
}

export async function verifySelfTiling(
  tilePng: Buffer,
): Promise<{ passed: boolean; score: number }> {
  const { data, info } = await sharp(tilePng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  if (!width || !height) {
    return { passed: false, score: 0 };
  }

  let leftRightTotal = 0;
  for (let y = 0; y < height; y += 1) {
    leftRightTotal += rgbDistance(
      data,
      pixelOffset(0, y, width),
      data,
      pixelOffset(width - 1, y, width),
    );
  }

  let topBottomTotal = 0;
  for (let x = 0; x < width; x += 1) {
    topBottomTotal += rgbDistance(
      data,
      pixelOffset(x, 0, width),
      data,
      pixelOffset(x, height - 1, width),
    );
  }

  const score = Math.min(
    similarityFromMad(leftRightTotal / height),
    similarityFromMad(topBottomTotal / width),
  );
  return {
    passed: score >= SELF_TILING_PASS_THRESHOLD,
    score,
  };
}

export async function removeBackground(imagePng: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(imagePng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const pixels = Buffer.from(data);
  const corners = [
    pixelOffset(0, 0, width),
    pixelOffset(width - 1, 0, width),
    pixelOffset(0, height - 1, width),
    pixelOffset(width - 1, height - 1, width),
  ];
  const background = corners.reduce((sum, offset) => {
    sum[0] += pixels[offset];
    sum[1] += pixels[offset + 1];
    sum[2] += pixels[offset + 2];
    return sum;
  }, [0, 0, 0]);
  const sample = Buffer.from([
    Math.round(background[0] / corners.length),
    Math.round(background[1] / corners.length),
    Math.round(background[2] / corners.length),
    255,
  ]);

  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (rgbDistance(pixels, offset, sample, 0) <= BACKGROUND_DISTANCE_THRESHOLD) {
      pixels[offset + 3] = 0;
    }
  }

  return sharp(pixels, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

interface RawTile {
  data: Buffer;
  width: number;
  height: number;
}

function sideOffset(
  width: number,
  height: number,
  side: AutotileSide,
  index: number,
): number {
  switch (side) {
    case 'north':
      return pixelOffset(index, 0, width);
    case 'south':
      return pixelOffset(index, height - 1, width);
    case 'west':
      return pixelOffset(0, index, width);
    case 'east':
      return pixelOffset(width - 1, index, width);
    default: {
      const exhaustive: never = side;
      return exhaustive;
    }
  }
}

function edgeLength(tile: RawTile, side: AutotileSide): number {
  return side === 'north' || side === 'south' ? tile.width : tile.height;
}

function edgeSimilarity(
  left: RawTile,
  right: RawTile,
  leftSide: AutotileSide,
  rightSide: AutotileSide,
): number {
  const length = Math.min(edgeLength(left, leftSide), edgeLength(right, rightSide));
  if (length === 0) {
    return 0;
  }
  let total = 0;
  for (let index = 0; index < length; index += 1) {
    total += rgbDistance(
      left.data,
      sideOffset(left.width, left.height, leftSide, index),
      right.data,
      sideOffset(right.width, right.height, rightSide, index),
    );
  }
  return similarityFromMad(total / length);
}

async function readSlot(
  sheet: Buffer,
  tileSize: TileSize,
  column: number,
  row: number,
  sheetWidth: number,
  sheetHeight: number,
): Promise<RawTile | null> {
  const left = column * tileSize;
  const top = row * tileSize;
  if (left + tileSize > sheetWidth || top + tileSize > sheetHeight) {
    return null;
  }
  const extracted = await sharp(sheet)
    .extract({ left, top, width: tileSize, height: tileSize })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data: extracted.data,
    width: extracted.info.width,
    height: extracted.info.height,
  };
}

export async function validatePathAutotileSlots(
  sheet: Buffer,
  tileSize: TileSize,
  layout: PathAutotileLayout,
): Promise<{ reviewPassed: boolean; passedSlotIds: string[] }> {
  const metadata = await sharp(sheet).metadata();
  const sheetWidth = metadata.width ?? 0;
  const sheetHeight = metadata.height ?? 0;
  const tiles = new Map<string, RawTile | null>();
  for (const slot of layout.slots) {
    tiles.set(
      slot.id,
      await readSlot(sheet, tileSize, slot.column, slot.row, sheetWidth, sheetHeight),
    );
  }

  const scores = new Map<string, number[]>();
  for (const slot of layout.slots) {
    scores.set(slot.id, []);
  }
  for (const adjacency of layout.adjacencies) {
    const left = tiles.get(adjacency.slotId);
    const right = tiles.get(adjacency.neighborId);
    const score = left && right
      ? edgeSimilarity(left, right, adjacency.side, adjacency.neighborSide)
      : 0;
    scores.get(adjacency.slotId)?.push(score);
    scores.get(adjacency.neighborId)?.push(score);
  }

  const passedSlotIds = layout.slots.filter((slot) => {
    const slotScores = scores.get(slot.id) ?? [];
    return slotScores.length > 0
      && slotScores.every((score) => score >= SELF_TILING_PASS_THRESHOLD);
  }).map((slot) => slot.id);
  const requiredIds = layout.slots.filter((slot) => slot.required).map((slot) => slot.id);

  return {
    reviewPassed: requiredIds.every((id) => passedSlotIds.includes(id)),
    passedSlotIds,
  };
}

export async function postProcessGeneratedImage(
  raw: RawGenerationResult | Uint8Array,
  tileSize: TileSize,
  outputContract: GenerationOutputContract,
  options: PostProcessOptions = BASELINE_POST_PROCESS,
): Promise<ProcessedGenerationResult> {
  const rawBytes = raw instanceof Uint8Array ? raw : raw.bytes;
  const fitted = await fitCanonicalImage(
    rawBytes,
    outputContract.width,
    outputContract.height,
    tileSize,
    options,
  );

  switch (outputContract.kind) {
    case 'prop': {
      const matted = await removeBackground(fitted);
      return {
        mimeType: 'image/png',
        bytes: new Uint8Array(matted),
        generationMode: 'prop',
        tilingMode: 'individual',
        reviewPassed: true,
      };
    }
    case 'path-autotile': {
      if (!outputContract.layout) {
        throw new Error('Path autotile output is missing its layout');
      }
      const validation = await validatePathAutotileSlots(
        fitted,
        tileSize,
        outputContract.layout,
      );
      return {
        mimeType: 'image/png',
        bytes: new Uint8Array(fitted),
        generationMode: 'path-autotile',
        tilingMode: 'individual',
        reviewPassed: validation.reviewPassed,
        pathAutotileLayoutId: outputContract.pathAutotileLayoutId,
        parentMaterialId: outputContract.parentMaterialId,
        passedSlotIds: validation.passedSlotIds,
      };
    }
    case 'transition':
      return {
        mimeType: 'image/png',
        bytes: new Uint8Array(fitted),
        generationMode: 'texture',
        tilingMode: 'individual',
        reviewPassed: true,
      };
    case 'surface': {
      const verification = await verifySelfTiling(fitted);
      return {
        mimeType: 'image/png',
        bytes: new Uint8Array(fitted),
        generationMode: 'texture',
        tilingMode: 'individual',
        selfTilingScore: verification.score,
        reviewPassed: verification.passed,
      };
    }
    default: {
      const exhaustive: never = outputContract.kind;
      return exhaustive;
    }
  }
}
