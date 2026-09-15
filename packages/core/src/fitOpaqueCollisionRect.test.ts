import { describe, it, expect } from 'vitest';
import { fitOpaqueCollisionRect } from './fitOpaqueCollisionRect';

function rgba(width: number, height: number, fill: (x: number, y: number) => number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      pixels[i + 3] = fill(x, y);
    }
  }
  return pixels;
}

describe('fitOpaqueCollisionRect', () => {
  it('returns null when every pixel is transparent or below the threshold', () => {
    expect(fitOpaqueCollisionRect(rgba(4, 4, () => 0), 4, 4)).toBeNull();
    expect(fitOpaqueCollisionRect(rgba(4, 4, () => 16), 4, 4)).toBeNull();
  });

  it('fits the tight box around opaque pixels in normalized tile space', () => {
    const pixels = rgba(8, 8, (x, y) => (x >= 2 && x <= 4 && y >= 5 && y <= 6 ? 255 : 0));

    expect(fitOpaqueCollisionRect(pixels, 8, 8)).toEqual({
      x: 2 / 8,
      y: 5 / 8,
      width: 3 / 8,
      height: 2 / 8,
    });
  });

  it('treats a fully opaque tile as a full-cell rectangle', () => {
    expect(fitOpaqueCollisionRect(rgba(2, 2, () => 255), 2, 2)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });
});
