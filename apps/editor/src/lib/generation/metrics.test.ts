import sharp from 'sharp';

import { measureAgainstReference, measureTile } from './metrics';
import { buildPalette, quantiseRgba } from './paletteQuantiser';

type Painter = (x: number, y: number) => [number, number, number];

async function png(size: number, paint: Painter): Promise<Buffer> {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = paint(x, y);
      const offset = (y * size + x) * 4;
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = 255;
    }
  }
  return sharp(pixels, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}

/** Deterministic pseudo-random texture; `seed` selects an unrelated pattern. */
function noise(seed: number, base = 130, spread = 100): Painter {
  return (x, y) => {
    let value = Math.imul(x * 73856093 ^ y * 19349663 ^ seed * 83492791, 2654435761) >>> 0;
    value = (value ^ (value >>> 15)) >>> 0;
    const tone = base - spread / 2 + ((value % 8) * spread) / 7;
    return [tone, tone, tone];
  };
}

/** Large flat blobs: few isolated pixels, big regions. */
const blobs: Painter = (x, y) => (
  (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? [30, 90, 160] : [60, 140, 210]
);

jest.setTimeout(60_000);

describe('measureTile', () => {
  it('tells pixel noise from flat regions', async () => {
    const noisy = await measureTile(await png(32, noise(1)));
    const flat = await measureTile(await png(32, blobs));

    expect(noisy.isolatedPixelRatio).toBeGreaterThan(0.3);
    expect(flat.isolatedPixelRatio).toBe(0);
    expect(flat.meanRegionSize).toBeGreaterThan(noisy.meanRegionSize * 10);
    expect(flat.colourCount).toBe(2);
  });

  it('measures the wrap seam against ordinary neighbours', async () => {
    const wrapping = await measureTile(await png(32, noise(1, 130, 20)));
    const dark = noise(2, 60, 20);
    const light = noise(3, 200, 20);
    const broken = await measureTile(await png(32, (x, y) => (
      x < 16 ? dark(x, y) : light(x, y)
    )));

    expect(wrapping.seamRatio).toBeLessThan(1.5);
    expect(broken.seamRatio).toBeGreaterThan(5);
  });

  it('detects a motif that repeats inside the image', async () => {
    const motif = noise(7);
    const mosaic = await measureTile(await png(64, (x, y) => motif(x % 16, y % 16)));
    const single = await measureTile(await png(64, noise(7)));

    expect(mosaic.internalRepeat).toBeGreaterThan(0.9);
    expect(single.internalRepeat).toBeLessThan(0.5);
  });
});

describe('measureAgainstReference', () => {
  it('flags a recoloured copy and ignores an unrelated texture', async () => {
    const reference = await png(32, noise(3));
    const recoloured = await png(32, (x, y) => {
      const [tone] = noise(3)(x, y);
      return [tone / 4, tone / 2, tone];
    });
    const unrelated = await png(32, noise(99));

    const copy = await measureAgainstReference(recoloured, reference);
    const other = await measureAgainstReference(unrelated, reference);

    expect(copy.copyScore).toBeGreaterThan(0.9);
    expect(copy.meanColourDistance).toBeGreaterThan(0.1);
    expect(other.copyScore).toBeLessThan(0.4);
  });

  it('finds the same motif drawn at a smaller scale', async () => {
    const motif = noise(5);
    const reference = await png(32, (x, y) => motif(Math.floor(x / 4), Math.floor(y / 4)));
    const mosaic = await png(32, (x, y) => motif(x % 8, y % 8));

    const result = await measureAgainstReference(mosaic, reference);

    expect(result.copyScore).toBeGreaterThan(0.9);
    expect(result.copyScale).toBe('r4');
  });
});

describe('paletteQuantiser', () => {
  it('stops at the requested number of colours, unlike sharp palette mode', async () => {
    const rgba = Buffer.alloc(64 * 4);
    for (let index = 0; index < 64; index += 1) {
      rgba[index * 4] = index * 4;
      rgba[index * 4 + 1] = 255 - index * 4;
      rgba[index * 4 + 2] = (index * 37) % 256;
      rgba[index * 4 + 3] = 255;
    }

    const palette = buildPalette(rgba, 8);
    const quantised = quantiseRgba(rgba, 8);
    const distinct = new Set<number>();
    for (let offset = 0; offset < quantised.length; offset += 4) {
      distinct.add((quantised[offset] << 16) | (quantised[offset + 1] << 8) | quantised[offset + 2]);
    }

    expect(palette.length).toBeLessThanOrEqual(8);
    expect(distinct.size).toBeLessThanOrEqual(8);
    expect(quantised.length).toBe(rgba.length);
  });

  it('keeps an image that already fits unchanged', () => {
    const rgba = Buffer.from([10, 20, 30, 255, 200, 100, 50, 255]);
    expect(quantiseRgba(rgba, 4).equals(rgba)).toBe(true);
  });
});
