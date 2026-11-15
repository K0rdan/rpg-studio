import sharp from 'sharp';

import { quantiseRgba } from './paletteQuantiser';

/**
 * Objective, model-agnostic measurements of a generated tile. They exist so
 * two pipeline variants can be compared with numbers and not only by eye.
 * They never gate generation; the surface review score stays in postProcessor.
 */

/** Resolution used for structural comparisons (copy / repeat detection). */
export const STRUCTURE_SIZE = 32;

/** Resolution of the reference comparison. */
export const COPY_SIZE = STRUCTURE_SIZE;

/** The same motif can be redrawn 2x or 4x smaller; compare at these repeats. */
const COPY_REPEATS = [1, 2, 4] as const;

/**
 * Region and noise metrics compare exact colours, so every tile is first
 * reduced to this many colours; otherwise any anti-aliased image would look
 * like pure noise and variants with different palettes would not be comparable.
 */
export const REGION_PALETTE_SIZE = 16;

interface RgbaImage {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface TileMetrics {
  width: number;
  height: number;
  /** Distinct colours. A readable tile usually stays well under 32. */
  colourCount: number;
  meanColour: [number, number, number];
  /**
   * Mean colour jump across the wrap seam divided by the mean jump between
   * ordinary neighbouring columns/rows. ~1 means invisible seam, >1.5 visible.
   */
  seamRatio: number;
  /** Share of pixels with no 4-neighbour of the same colour (pixel noise). */
  isolatedPixelRatio: number;
  /** Average area of 4-connected flat colour regions, in pixels. */
  meanRegionSize: number;
  /**
   * Strongest luminance correlation of the tile with a copy of itself shifted
   * by at least a quarter of its side (wrapping). High = a motif repeats
   * inside the image, e.g. a 4x4 mosaic of the same patch.
   */
  internalRepeat: number;
}

export interface ReferenceMetrics {
  /**
   * Strongest luminance correlation with the reference over every wrapping
   * shift. ~1 means the layout is a copy (possibly recoloured or shifted),
   * <0.3 means unrelated structure.
   */
  copyScore: number;
  copyShift: [number, number];
  /** Repeat factor of the candidate (c) or reference (r) that matched best, e.g. "c4". */
  copyScale: string;
  /** Distance between mean colours, 0 (same) to 1 (black vs white). */
  meanColourDistance: number;
}

export interface GenerationMetrics {
  raw?: TileMetrics;
  post?: TileMetrics;
  /** One entry per reference image, in request order. */
  rawVsReference: ReferenceMetrics[];
  postVsReference: ReferenceMetrics[];
}

async function readRgba(png: Uint8Array | Buffer): Promise<RgbaImage> {
  const { data, info } = await sharp(Buffer.from(png))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

async function toLuma(png: Uint8Array | Buffer, size: number): Promise<Float64Array> {
  const source = sharp(Buffer.from(png));
  const metadata = await source.metadata();
  const upscaling = (metadata.width ?? size) < size;
  const { data } = await source
    .resize(size, size, {
      fit: 'fill',
      kernel: upscaling ? sharp.kernel.nearest : sharp.kernel.lanczos3,
    })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return Float64Array.from(data);
}

function pixelKey(image: RgbaImage, x: number, y: number): number {
  const offset = (y * image.width + x) * 4;
  return (image.data[offset] << 16) | (image.data[offset + 1] << 8) | image.data[offset + 2];
}

function channelDistance(image: RgbaImage, ax: number, ay: number, bx: number, by: number): number {
  const a = (ay * image.width + ax) * 4;
  const b = (by * image.width + bx) * 4;
  return (
    Math.abs(image.data[a] - image.data[b])
    + Math.abs(image.data[a + 1] - image.data[b + 1])
    + Math.abs(image.data[a + 2] - image.data[b + 2])
  ) / 3;
}

function seamRatio(image: RgbaImage): number {
  const { width, height } = image;
  if (width < 3 || height < 3) {
    return 1;
  }
  let wrapX = 0;
  let wrapY = 0;
  let innerX = 0;
  let innerY = 0;
  for (let y = 0; y < height; y += 1) {
    wrapX += channelDistance(image, width - 1, y, 0, y);
    for (let x = 0; x < width - 1; x += 1) {
      innerX += channelDistance(image, x, y, x + 1, y);
    }
  }
  for (let x = 0; x < width; x += 1) {
    wrapY += channelDistance(image, x, height - 1, x, 0);
    for (let y = 0; y < height - 1; y += 1) {
      innerY += channelDistance(image, x, y, x, y + 1);
    }
  }
  const wrapMeanX = wrapX / height;
  const wrapMeanY = wrapY / width;
  const innerMeanX = innerX / (height * (width - 1));
  const innerMeanY = innerY / (width * (height - 1));
  const ratio = (wrap: number, inner: number) => (
    wrap < 1 && inner < 1 ? 1 : wrap / Math.max(inner, 1)
  );
  return Math.max(ratio(wrapMeanX, innerMeanX), ratio(wrapMeanY, innerMeanY));
}

function isolatedAndRegions(image: RgbaImage): { isolated: number; meanRegion: number } {
  const { width, height } = image;
  const keys = new Int32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      keys[y * width + x] = pixelKey(image, x, y);
    }
  }
  const wrap = (value: number, size: number) => (value + size) % size;

  let isolated = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = keys[y * width + x];
      const alone = keys[y * width + wrap(x - 1, width)] !== key
        && keys[y * width + wrap(x + 1, width)] !== key
        && keys[wrap(y - 1, height) * width + x] !== key
        && keys[wrap(y + 1, height) * width + x] !== key;
      if (alone) {
        isolated += 1;
      }
    }
  }

  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  let regions = 0;
  for (let start = 0; start < keys.length; start += 1) {
    if (visited[start]) {
      continue;
    }
    regions += 1;
    visited[start] = 1;
    stack.push(start);
    while (stack.length > 0) {
      const index = stack.pop() as number;
      const x = index % width;
      const y = (index - x) / width;
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];
      for (const next of neighbours) {
        if (next >= 0 && !visited[next] && keys[next] === keys[index]) {
          visited[next] = 1;
          stack.push(next);
        }
      }
    }
  }
  return {
    isolated: isolated / keys.length,
    meanRegion: keys.length / Math.max(regions, 1),
  };
}

function colourStats(image: RgbaImage): {
  colourCount: number;
  meanColour: [number, number, number];
} {
  const seen = new Set<number>();
  const total = [0, 0, 0];
  const pixels = image.width * image.height;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      seen.add(pixelKey(image, x, y));
      total[0] += image.data[offset];
      total[1] += image.data[offset + 1];
      total[2] += image.data[offset + 2];
    }
  }
  return {
    colourCount: seen.size,
    meanColour: [
      Math.round(total[0] / pixels),
      Math.round(total[1] / pixels),
      Math.round(total[2] / pixels),
    ],
  };
}

function centred(values: Float64Array): { values: Float64Array; norm: number } {
  let mean = 0;
  for (const value of values) {
    mean += value;
  }
  mean /= values.length;
  const out = new Float64Array(values.length);
  let norm = 0;
  for (let index = 0; index < values.length; index += 1) {
    out[index] = values[index] - mean;
    norm += out[index] * out[index];
  }
  return { values: out, norm: Math.sqrt(norm) };
}

function circularDistance(shift: number, size: number): number {
  return Math.min(shift, size - shift);
}

/** Normalised cross-correlation of two equally sized square luminance maps. */
function bestShiftedCorrelation(
  left: Float64Array,
  right: Float64Array,
  size: number,
  accept: (dx: number, dy: number) => boolean,
): { score: number; shift: [number, number] } {
  const a = centred(left);
  const b = centred(right);
  if (a.norm === 0 || b.norm === 0) {
    return { score: 0, shift: [0, 0] };
  }
  // `size` is a power of two so wrapping is a bit mask (this loop is hot).
  const mask = size - 1;
  let best = -1;
  let bestShift: [number, number] = [0, 0];
  for (let dy = 0; dy < size; dy += 1) {
    for (let dx = 0; dx < size; dx += 1) {
      if (!accept(dx, dy)) {
        continue;
      }
      let sum = 0;
      for (let y = 0; y < size; y += 1) {
        const rowA = y * size;
        const rowB = ((y + dy) & mask) * size;
        for (let x = 0; x < size; x += 1) {
          sum += a.values[rowA + x] * b.values[rowB + ((x + dx) & mask)];
        }
      }
      const score = sum / (a.norm * b.norm);
      if (score > best) {
        best = score;
        bestShift = [dx, dy];
      }
    }
  }
  return { score: Math.max(0, best), shift: bestShift };
}

export async function measureTile(png: Uint8Array | Buffer): Promise<TileMetrics> {
  const image = await readRgba(png);
  const structure = await toLuma(png, STRUCTURE_SIZE);
  const regions = isolatedAndRegions({
    ...image,
    data: quantiseRgba(image.data, REGION_PALETTE_SIZE),
  });
  const minimumShift = STRUCTURE_SIZE / 4;
  const repeat = bestShiftedCorrelation(
    structure,
    structure,
    STRUCTURE_SIZE,
    (dx, dy) => (
      Math.max(
        circularDistance(dx, STRUCTURE_SIZE),
        circularDistance(dy, STRUCTURE_SIZE),
      ) >= minimumShift
    ),
  );
  return {
    width: image.width,
    height: image.height,
    ...colourStats(image),
    seamRatio: seamRatio(image),
    isolatedPixelRatio: regions.isolated,
    meanRegionSize: regions.meanRegion,
    internalRepeat: repeat.score,
  };
}

function tileLuma(values: Float64Array, size: number, repeats: number): Float64Array {
  const total = size * repeats;
  const out = new Float64Array(total * total);
  for (let y = 0; y < total; y += 1) {
    for (let x = 0; x < total; x += 1) {
      out[y * total + x] = values[(y % size) * size + (x % size)];
    }
  }
  return out;
}

async function repeatedLuma(
  png: Uint8Array | Buffer,
): Promise<Map<number, Float64Array>> {
  const byRepeat = new Map<number, Float64Array>();
  for (const repeats of COPY_REPEATS) {
    const size = COPY_SIZE / repeats;
    byRepeat.set(repeats, tileLuma(await toLuma(png, size), size, repeats));
  }
  return byRepeat;
}

export async function measureAgainstReference(
  candidate: Uint8Array | Buffer,
  reference: Uint8Array | Buffer,
): Promise<ReferenceMetrics> {
  const [candidateLuma, referenceLuma, candidateImage, referenceImage] = await Promise.all([
    repeatedLuma(candidate),
    repeatedLuma(reference),
    readRgba(candidate),
    readRgba(reference),
  ]);
  let best = { score: 0, shift: [0, 0] as [number, number], scale: 'c1' };
  const pairs: Array<[number, number, string]> = COPY_REPEATS.flatMap((repeats) => (
    repeats === 1
      ? [[1, 1, 'c1'] as [number, number, string]]
      : [
        [repeats, 1, `c${repeats}`] as [number, number, string],
        [1, repeats, `r${repeats}`] as [number, number, string],
      ]
  ));
  for (const [candidateRepeats, referenceRepeats, scale] of pairs) {
    const match = bestShiftedCorrelation(
      candidateLuma.get(candidateRepeats) as Float64Array,
      referenceLuma.get(referenceRepeats) as Float64Array,
      COPY_SIZE,
      () => true,
    );
    if (match.score > best.score) {
      best = { ...match, scale };
    }
  }
  const left = colourStats(candidateImage).meanColour;
  const right = colourStats(referenceImage).meanColour;
  const distance = Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
  return {
    copyScore: best.score,
    copyShift: best.shift,
    copyScale: best.scale,
    meanColourDistance: distance / Math.hypot(255, 255, 255),
  };
}

export async function measureGeneration(input: {
  raw?: Uint8Array | Buffer;
  post?: Uint8Array | Buffer;
  references: Array<Uint8Array | Buffer>;
}): Promise<GenerationMetrics> {
  return {
    raw: input.raw ? await measureTile(input.raw) : undefined,
    post: input.post ? await measureTile(input.post) : undefined,
    rawVsReference: input.raw
      ? await Promise.all(input.references.map((ref) => measureAgainstReference(input.raw as Uint8Array, ref)))
      : [],
    postVsReference: input.post
      ? await Promise.all(input.references.map((ref) => measureAgainstReference(input.post as Uint8Array, ref)))
      : [],
  };
}
