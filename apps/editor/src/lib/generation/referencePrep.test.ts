import sharp from 'sharp';

import type { GenerationReferenceImage } from '@packages/types';

import { prepareReferenceImages, seededPermutation } from './referencePrep';

async function colourful(): Promise<GenerationReferenceImage> {
  const size = 16;
  const pixels = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 3;
      pixels[offset] = x * 16;
      pixels[offset + 1] = y * 16;
      pixels[offset + 2] = 200;
    }
  }
  const bytes = await sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toBuffer();
  return { tilesetId: 'ground-gen1', mimeType: 'image/png', bytes: new Uint8Array(bytes) };
}

async function rawRgb(image: GenerationReferenceImage): Promise<Buffer> {
  return sharp(Buffer.from(image.bytes)).removeAlpha().raw().toBuffer();
}

describe('prepareReferenceImages', () => {
  it('passes the stored image through for `full` and drops it for `none`', async () => {
    const image = await colourful();

    await expect(prepareReferenceImages([image], 'full')).resolves.toEqual([image]);
    await expect(prepareReferenceImages([image], 'none')).resolves.toEqual([]);
  });

  it('removes colour for `gray` and keeps the layout', async () => {
    const image = await colourful();
    const [gray] = await prepareReferenceImages([image], 'gray');
    const original = await rawRgb(image);
    const result = await rawRgb(gray);

    expect(gray.tilesetId).toBe(image.tilesetId);
    expect(result.length).toBe(original.length);
    for (let offset = 0; offset < result.length; offset += 3) {
      expect(result[offset]).toBe(result[offset + 1]);
      expect(result[offset]).toBe(result[offset + 2]);
    }
  });

  it('shuffles tiles deterministically for `scrambled-gray`', async () => {
    const image = await colourful();
    const [first] = await prepareReferenceImages([image], 'scrambled-gray');
    const [second] = await prepareReferenceImages([image], 'scrambled-gray');
    const [gray] = await prepareReferenceImages([image], 'gray');

    expect(Buffer.from(first.bytes).equals(Buffer.from(second.bytes))).toBe(true);
    expect(Buffer.from(first.bytes).equals(Buffer.from(gray.bytes))).toBe(false);
    const scrambled = await rawRgb(first);
    const plain = await rawRgb(gray);
    expect([...scrambled].sort((a, b) => a - b)).toEqual([...plain].sort((a, b) => a - b));
  });
});

describe('seededPermutation', () => {
  it('is a stable permutation of all indexes', () => {
    const order = seededPermutation(16, 42);

    expect(order).toEqual(seededPermutation(16, 42));
    expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });
});
