import sharp from 'sharp';

import { resolveOutputContract } from './outputContract';
import { PATH_CENTER_EDGES_CORNERS_V1 } from './pathAutotileLayout';
import {
  createBrokenAutotilePng,
  createMalformedPng,
  createMismatchedEdgeTilePng,
  createPropOnFlatBackgroundPng,
  createSelfTilingTilePng,
  createUniformAutotilePng,
  createUniformJpeg,
} from './__tests__/imageFixtures';
import {
  BASELINE_POST_PROCESS,
  postProcessGeneratedImage,
  removeBackground,
  validatePathAutotileSlots,
  verifySelfTiling,
} from './postProcessor';

const surface = (tileSize: 16 | 32 | 64 | 128) => resolveOutputContract({
  stage: 'base',
  generationMode: 'texture',
  tileSize,
});

describe('verifySelfTiling', () => {
  it('passes a known-good wrapping tile and fails mismatched edges', async () => {
    const good = await verifySelfTiling(await createSelfTilingTilePng(16));
    const bad = await verifySelfTiling(await createMismatchedEdgeTilePng(16));

    expect(good.passed).toBe(true);
    expect(good.score).toBeGreaterThan(0.92);
    expect(bad.passed).toBe(false);
    expect(bad.score).toBeLessThan(0.5);
  });
});

describe('removeBackground', () => {
  it('clears a near-uniform background and keeps the object opaque', async () => {
    const source = await createPropOnFlatBackgroundPng(16);
    const result = await removeBackground(source);
    const { data, info } = await sharp(result).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    const corner = data.subarray(0, 4);
    const object = data.subarray((8 * info.width + 8) * 4, (8 * info.width + 9) * 4);

    expect(info.width).toBe(16);
    expect(info.height).toBe(16);
    expect(corner[3]).toBe(0);
    expect(object[0]).toBeGreaterThan(150);
    expect(object[3]).toBe(255);
  });
});

describe('postProcessGeneratedImage', () => {
  it('fits a surface to one canonical tile and rejects mismatched edges', async () => {
    const good = await postProcessGeneratedImage(
      await createSelfTilingTilePng(16),
      16,
      surface(16),
    );
    const largeUniform = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 40, g: 160, b: 70, alpha: 1 },
      },
    }).png().toBuffer();
    const fromLarge = await postProcessGeneratedImage(largeUniform, 16, surface(16));
    const failed = await postProcessGeneratedImage(
      await createMismatchedEdgeTilePng(16),
      16,
      surface(16),
    );
    const goodMetadata = await sharp(Buffer.from(good.bytes)).metadata();
    const failedMetadata = await sharp(Buffer.from(failed.bytes)).metadata();

    expect(good.reviewPassed).toBe(true);
    expect(good.tilingMode).toBe('individual');
    expect(good.selfTilingScore).toBeGreaterThan(0.92);
    expect(goodMetadata.width).toBe(16);
    expect(goodMetadata.height).toBe(16);
    expect(goodMetadata.format).toBe('png');
    expect(fromLarge.reviewPassed).toBe(true);
    expect((await sharp(Buffer.from(fromLarge.bytes)).metadata()).width).toBe(16);
    expect(failed.reviewPassed).toBe(false);
    expect(failed.tilingMode).not.toBe('fixed-block');
    expect(failed.generationMode).toBe('texture');
    expect(failedMetadata.width).toBe(16);
    expect(failedMetadata.height).toBe(16);
  });

  it('keeps a hard pixel edge while quantizing a canonical surface', async () => {
    const opaqueHalf = await sharp({
      create: {
        width: 32,
        height: 64,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    }).png().toBuffer();
    const source = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 0 },
      },
    })
      .composite([{ input: opaqueHalf, left: 0, top: 0 }])
      .png()
      .toBuffer();

    const result = await postProcessGeneratedImage(source, 32, surface(32));
    const metadata = await sharp(Buffer.from(result.bytes)).metadata();
    const raw = await sharp(Buffer.from(result.bytes)).ensureAlpha().raw().toBuffer();
    const left = raw.subarray((8 * 32 + 8) * 4, (8 * 32 + 9) * 4);
    const right = raw.subarray((8 * 32 + 24) * 4, (8 * 32 + 25) * 4);

    expect(metadata.format).toBe('png');
    expect(metadata.isPalette).toBe(true);
    expect(metadata.width).toBe(32);
    expect(metadata.height).toBe(32);
    expect([...left.subarray(0, 3)]).toEqual([255, 0, 0]);
    expect(left[3]).toBe(255);
    expect(right[3]).toBe(0);
  });

  it('converts a raw JPEG into a canonical PNG surface', async () => {
    const result = await postProcessGeneratedImage(
      await createUniformJpeg(64),
      32,
      surface(32),
    );
    const metadata = await sharp(Buffer.from(result.bytes)).metadata();

    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(32);
    expect(metadata.height).toBe(32);
    expect(result.reviewPassed).toBe(true);
  });

  it('mattes one prop tile without a self-tiling score', async () => {
    const result = await postProcessGeneratedImage(
      await createPropOnFlatBackgroundPng(16),
      16,
      resolveOutputContract({ stage: 'base', generationMode: 'prop', tileSize: 16 }),
    );
    const raw = await sharp(Buffer.from(result.bytes)).ensureAlpha().raw().toBuffer();
    const metadata = await sharp(Buffer.from(result.bytes)).metadata();

    expect(result.generationMode).toBe('prop');
    expect(result.tilingMode).toBe('individual');
    expect(result.selfTilingScore).toBeUndefined();
    expect(result.reviewPassed).toBe(true);
    expect(metadata.width).toBe(16);
    expect(raw[3]).toBe(0);
  });

  it('rejects malformed and undersized image data', async () => {
    await expect(postProcessGeneratedImage(createMalformedPng(), 32, surface(32))).rejects.toThrow();
    const tiny = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    }).png().toBuffer();
    await expect(postProcessGeneratedImage(tiny, 16, surface(16))).rejects.toThrow(/small/i);
  });
});

describe('validatePathAutotileSlots', () => {
  it('passes every required neighbour on a uniform atlas', async () => {
    const result = await validatePathAutotileSlots(
      await createUniformAutotilePng(16),
      16,
      PATH_CENTER_EDGES_CORNERS_V1,
    );

    expect(result.reviewPassed).toBe(true);
    expect(result.passedSlotIds).toEqual(
      PATH_CENTER_EDGES_CORNERS_V1.slots.map((slot) => slot.id),
    );
  });

  it('withholds slots whose shared edge does not match', async () => {
    const processed = await postProcessGeneratedImage(
      await createBrokenAutotilePng(16),
      16,
      resolveOutputContract({
        stage: 'family',
        generationMode: 'path-autotile',
        tileSize: 16,
        parentMaterialId: 'surface-1',
      }),
    );

    expect(processed.reviewPassed).toBe(false);
    expect(processed.passedSlotIds).toContain('edge-w');
    expect(processed.passedSlotIds).not.toContain('center');
    expect(processed.passedSlotIds).not.toContain('edge-e');
    expect(processed.pathAutotileLayoutId).toBe('path-center-edges-corners-v1');
    expect((await sharp(Buffer.from(processed.bytes)).metadata()).width).toBe(48);
  });

  it('treats slots outside the image as missing', async () => {
    const result = await validatePathAutotileSlots(
      await createSelfTilingTilePng(16),
      16,
      PATH_CENTER_EDGES_CORNERS_V1,
    );

    expect(result.reviewPassed).toBe(false);
    expect(result.passedSlotIds).toEqual([]);
  });
});

describe('post-process options', () => {
  async function busyRaw(size: number): Promise<Buffer> {
    const pixels = Buffer.alloc(size * size * 3);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const offset = (y * size + x) * 3;
        const band = Math.floor(x / (size / 4)) % 2 === 0;
        const fuzz = (x * 7 + y * 13) % 9;
        pixels[offset] = (band ? 40 : 200) + fuzz;
        pixels[offset + 1] = (band ? 90 : 160) + fuzz;
        pixels[offset + 2] = 120 + fuzz;
      }
    }
    return sharp(pixels, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
  }

  async function distinctColours(png: Uint8Array): Promise<number> {
    const { data } = await sharp(Buffer.from(png)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const seen = new Set<number>();
    for (let offset = 0; offset < data.length; offset += 4) {
      seen.add((data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2]);
    }
    return seen.size;
  }

  it('defaults to the historical behaviour', async () => {
    const raw = await busyRaw(128);
    const implicit = await postProcessGeneratedImage(raw, 16, surface(16));
    const explicit = await postProcessGeneratedImage(raw, 16, surface(16), BASELINE_POST_PROCESS);

    expect(Buffer.from(implicit.bytes).equals(Buffer.from(explicit.bytes))).toBe(true);
  });

  it('really limits the palette with the median-cut quantiser', async () => {
    const raw = await busyRaw(128);
    const sharpPalette = await postProcessGeneratedImage(raw, 32, surface(32), {
      ...BASELINE_POST_PROCESS,
      colours: 6,
    });
    const exact = await postProcessGeneratedImage(raw, 32, surface(32), {
      downscale: 'block-mode',
      quantiser: 'median-cut',
      colours: 6,
      cropFraction: 1,
    });

    expect(await distinctColours(exact.bytes)).toBeLessThanOrEqual(6);
    expect(await distinctColours(sharpPalette.bytes)).toBeGreaterThan(0);
  });

  it('crops the centre of the raw image before resizing', async () => {
    const raw = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .composite([{
        input: await sharp({
          create: { width: 32, height: 32, channels: 3, background: { r: 0, g: 0, b: 255 } },
        }).png().toBuffer(),
        left: 16,
        top: 16,
      }])
      .png()
      .toBuffer();

    const cropped = await postProcessGeneratedImage(raw, 16, surface(16), {
      downscale: 'block-mode',
      quantiser: 'median-cut',
      colours: 4,
      cropFraction: 0.5,
    });
    const { data } = await sharp(Buffer.from(cropped.bytes)).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });

    expect(await distinctColours(cropped.bytes)).toBe(1);
    expect(data[2]).toBe(255);
    expect(data[0]).toBe(0);
  });
});
