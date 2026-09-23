import sharp from 'sharp';

import type {
  GenerationMode,
  ProcessedGenerationResult,
  RawGenerationResult,
  TileSize,
} from '@packages/types';

const GRID_SIZE = 8;
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

export async function postProcessTileSheet(
  imageBytes: Uint8Array,
  tileSize: TileSize,
): Promise<Buffer> {
  const input = Buffer.from(imageBytes);
  const metadata = await sharp(input).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Generated image has invalid dimensions');
  }
  if (metadata.width < tileSize || metadata.height < tileSize) {
    throw new Error('Generated image is too small for the project tile size');
  }

  const dimension = tileSize * GRID_SIZE;
  return sharp(input)
    .resize(dimension, dimension, {
      fit: 'cover',
      position: 'centre',
      kernel: sharp.kernel.nearest,
    })
    .png({ palette: true, colours: 32, dither: 0 })
    .toBuffer();
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

async function extractTile(
  sheet: Buffer,
  tileSize: TileSize,
  column: number,
  row: number,
): Promise<Buffer> {
  return sharp(sheet)
    .extract({
      left: column * tileSize,
      top: row * tileSize,
      width: tileSize,
      height: tileSize,
    })
    .png()
    .toBuffer();
}

export async function postProcessGeneratedImage(
  raw: RawGenerationResult | Uint8Array,
  tileSize: TileSize,
  generationMode: GenerationMode,
): Promise<ProcessedGenerationResult> {
  const rawBytes = raw instanceof Uint8Array ? raw : raw.bytes;
  const sheet = await postProcessTileSheet(rawBytes, tileSize);

  if (generationMode === 'prop') {
    const matted = await removeBackground(sheet);
    return {
      mimeType: 'image/png',
      bytes: new Uint8Array(matted),
      generationMode: 'prop',
      tilingMode: 'individual',
    };
  }

  let minScore = 1;
  let allPassed = true;
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let column = 0; column < GRID_SIZE; column += 1) {
      const result = await verifySelfTiling(
        await extractTile(sheet, tileSize, column, row),
      );
      minScore = Math.min(minScore, result.score);
      if (!result.passed) {
        allPassed = false;
      }
    }
  }

  return {
    mimeType: 'image/png',
    bytes: new Uint8Array(sheet),
    generationMode: 'texture',
    tilingMode: allPassed ? 'individual' : 'fixed-block',
    selfTilingScore: minScore,
  };
}
