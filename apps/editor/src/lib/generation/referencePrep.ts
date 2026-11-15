import sharp from 'sharp';

import type { GenerationReferenceImage } from '@packages/types';

/**
 * How accepted family images are shown to the model as STYLE samples.
 *
 * - `full`: the stored image untouched (production behaviour).
 * - `none`: no image; style is carried by the prompt text only.
 * - `gray`: greyscale, so palette cannot be copied but layout still can.
 * - `scrambled-gray`: greyscale and tile-shuffled, so neither palette nor
 *   layout survive; only pixel size, outline weight, and grain do.
 */
export const REFERENCE_MODES = ['full', 'none', 'gray', 'scrambled-gray'] as const;
export type ReferenceMode = typeof REFERENCE_MODES[number];

const SCRAMBLE_GRID = 4;

/** Deterministic permutation so a scrambled reference is reproducible. */
export function seededPermutation(length: number, seed: number): number[] {
  const order = Array.from({ length }, (_, index) => index);
  let state = seed >>> 0 || 1;
  for (let index = length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}

async function toGray(bytes: Uint8Array): Promise<Buffer> {
  return sharp(Buffer.from(bytes)).greyscale().png().toBuffer();
}

async function scramble(bytes: Uint8Array, seed: number): Promise<Buffer> {
  const gray = await toGray(bytes);
  const { data, info } = await sharp(gray)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cellWidth = Math.floor(info.width / SCRAMBLE_GRID);
  const cellHeight = Math.floor(info.height / SCRAMBLE_GRID);
  if (cellWidth < 1 || cellHeight < 1) {
    return gray;
  }
  const order = seededPermutation(SCRAMBLE_GRID * SCRAMBLE_GRID, seed);
  const output = Buffer.from(data);

  for (let target = 0; target < order.length; target += 1) {
    const source = order[target];
    const targetX = (target % SCRAMBLE_GRID) * cellWidth;
    const targetY = Math.floor(target / SCRAMBLE_GRID) * cellHeight;
    const sourceX = (source % SCRAMBLE_GRID) * cellWidth;
    const sourceY = Math.floor(source / SCRAMBLE_GRID) * cellHeight;
    for (let y = 0; y < cellHeight; y += 1) {
      const from = ((sourceY + y) * info.width + sourceX) * 4;
      const to = ((targetY + y) * info.width + targetX) * 4;
      data.copy(output, to, from, from + cellWidth * 4);
    }
  }
  return sharp(output, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();
}

function seedFor(tilesetId: string): number {
  let hash = 2166136261;
  for (let index = 0; index < tilesetId.length; index += 1) {
    hash = Math.imul(hash ^ tilesetId.charCodeAt(index), 16777619) >>> 0;
  }
  return hash;
}

export async function prepareReferenceImages(
  images: GenerationReferenceImage[],
  mode: ReferenceMode,
): Promise<GenerationReferenceImage[]> {
  switch (mode) {
    case 'full':
      return images;
    case 'none':
      return [];
    case 'gray':
      return Promise.all(images.map(async (image) => ({
        ...image,
        bytes: new Uint8Array(await toGray(image.bytes)),
      })));
    case 'scrambled-gray':
      return Promise.all(images.map(async (image) => ({
        ...image,
        bytes: new Uint8Array(await scramble(image.bytes, seedFor(image.tilesetId))),
      })));
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}
