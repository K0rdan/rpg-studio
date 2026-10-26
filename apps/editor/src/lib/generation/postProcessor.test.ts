import sharp from 'sharp';

import {
  createMalformedPng,
  createMismatchedEdgeSheetPng,
  createMismatchedEdgeTilePng,
  createPropOnFlatBackgroundPng,
  createSelfTilingTilePng,
  createTileSheetPng,
} from './__tests__/imageFixtures';
import {
  postProcessGeneratedImage,
  postProcessTileSheet,
  removeBackground,
  resolveRequestedTilingMode,
  verifySelfTiling,
} from './postProcessor';

describe('postProcessTileSheet', () => {
  it.each([16, 32, 64, 128] as const)(
    'produces an exact 8x8 PNG for %ipx tiles',
    async (tileSize) => {
      const result = await postProcessTileSheet(await createTileSheetPng(16), tileSize);
      const metadata = await sharp(result).metadata();

      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(tileSize * 8);
      expect(metadata.height).toBe(tileSize * 8);
    },
  );

  it('uses nearest-neighbor fitting and 32-colour palette output', async () => {
    const source = await createTileSheetPng(16);
    const result = await postProcessTileSheet(source, 32);
    const metadata = await sharp(result).metadata();

    expect(metadata.isPalette).toBe(true);
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
  });

  it('crops a non-square source to the square output grid', async () => {
    const source = await sharp({
      create: {
        width: 160,
        height: 128,
        channels: 4,
        background: { r: 10, g: 20, b: 30, alpha: 1 },
      },
    }).png().toBuffer();

    const result = await postProcessTileSheet(source, 16);
    await expect(sharp(result).metadata()).resolves.toMatchObject({
      width: 128,
      height: 128,
    });
  });

  it('quantizes to 32 colours without dithering hard edges or dropping transparency', async () => {
    const opaqueHalf = await sharp({
      create: {
        width: 128,
        height: 256,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    }).png().toBuffer();
    const source = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 0 },
      },
    })
      .composite([{ input: opaqueHalf, left: 0, top: 0 }])
      .png()
      .toBuffer();

    const result = await postProcessTileSheet(source, 32);
    const metadata = await sharp(result).metadata();
    const raw = await sharp(result).ensureAlpha().raw().toBuffer();
    const left = raw.subarray((127 * 256 + 126) * 4, (127 * 256 + 130) * 4);
    const right = raw.subarray((127 * 256 + 129) * 4, (127 * 256 + 133) * 4);

    expect(metadata.format).toBe('png');
    expect(metadata.isPalette).toBe(true);
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
    expect(metadata.hasAlpha).toBe(true);
    expect([...left.subarray(0, 4)]).toEqual([255, 0, 0, 255]);
    expect(right[3]).toBe(0);
  });

  it('rejects malformed and undersized image data', async () => {
    await expect(postProcessTileSheet(createMalformedPng(), 32)).rejects.toThrow();
    const tiny = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    }).png().toBuffer();
    await expect(postProcessTileSheet(tiny, 16)).rejects.toThrow(/small/i);
  });
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

    expect(info.width).toBe(128);
    expect(info.height).toBe(128);
    expect(corner[3]).toBe(0);
    expect(object[0]).toBeGreaterThan(150);
    expect(object[3]).toBe(255);
  });
});

describe('postProcessGeneratedImage', () => {
  it('keeps wrapping texture sheets individual and falls back to a fixed block', async () => {
    const good = await postProcessGeneratedImage(
      await createTileSheetPng(16),
      16,
      'texture',
    );
    const fallback = await postProcessGeneratedImage(
      await createMismatchedEdgeSheetPng(16),
      16,
      'texture',
    );

    expect(good.tilingMode).toBe('individual');
    expect(good.selfTilingScore).toBeGreaterThan(0.92);
    expect(fallback.tilingMode).toBe('fixed-block');
    expect(good.bytes.length).toBeGreaterThan(0);
    expect(fallback.generationMode).toBe('texture');
  });

  it('mattes prop sheets without a self-tiling score', async () => {
    const result = await postProcessGeneratedImage(
      await createPropOnFlatBackgroundPng(16),
      16,
      'prop',
    );
    const raw = await sharp(Buffer.from(result.bytes)).ensureAlpha().raw().toBuffer();

    expect(result.generationMode).toBe('prop');
    expect(result.tilingMode).toBe('individual');
    expect(result.selfTilingScore).toBeUndefined();
    expect(raw[3]).toBe(0);
  });
});

describe('resolveRequestedTilingMode', () => {
  it('keeps the computed mode when the client omits tilingMode', () => {
    expect(resolveRequestedTilingMode(undefined, 'fixed-block')).toEqual({
      ok: true,
      mode: 'fixed-block',
    });
  });

  it('honors a valid requested mode over the computed fallback', () => {
    expect(resolveRequestedTilingMode('individual', 'fixed-block')).toEqual({
      ok: true,
      mode: 'individual',
    });
  });

  it('rejects an invalid requested mode', () => {
    expect(resolveRequestedTilingMode('wraparound', 'individual')).toEqual({
      ok: false,
      message: 'Invalid tiling mode',
    });
  });
});
