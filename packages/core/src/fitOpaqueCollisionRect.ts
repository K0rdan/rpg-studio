export const OPAQUE_ALPHA_THRESHOLD = 16;

export interface FittedCollisionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Tight AABB of pixels whose alpha is above `alphaThreshold`, in normalized tile space.
 * Returns null when no pixel qualifies (Fit opaque should leave the current rect alone).
 */
export function fitOpaqueCollisionRect(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number = OPAQUE_ALPHA_THRESHOLD,
): FittedCollisionRect | null {
  if (width <= 0 || height <= 0) return null;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha <= alphaThreshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return null;

  return {
    x: minX / width,
    y: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height,
  };
}
