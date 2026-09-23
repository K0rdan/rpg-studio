import sharp from 'sharp';

import type { TileSize } from '@packages/types';

const SHEET_GRID_SIZE = 8;

export async function createTileSheetPng(tileSize: TileSize = 16): Promise<Buffer> {
  const dimension = tileSize * SHEET_GRID_SIZE;
  const pixels = Buffer.alloc(dimension * dimension * 4);

  for (let y = 0; y < dimension; y += 1) {
    for (let x = 0; x < dimension; x += 1) {
      const offset = (y * dimension + x) * 4;
      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);

      pixels[offset] = tileX * 31;
      pixels[offset + 1] = tileY * 31;
      pixels[offset + 2] = (tileX + tileY) * 15;
      pixels[offset + 3] = 255;
    }
  }

  return sharp(pixels, {
    raw: {
      width: dimension,
      height: dimension,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

export function createMalformedPng(): Buffer {
  return Buffer.from('not-a-png', 'utf8');
}

async function rawRgbaPng(
  width: number,
  height: number,
  paint: (x: number, y: number) => [number, number, number, number],
): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const [r, g, b, a] = paint(x, y);
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = a;
    }
  }

  return sharp(pixels, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

export async function createSelfTilingTilePng(tileSize: TileSize = 16): Promise<Buffer> {
  return rawRgbaPng(tileSize, tileSize, () => [40, 160, 70, 255]);
}

export async function createMismatchedEdgeTilePng(tileSize: TileSize = 16): Promise<Buffer> {
  return rawRgbaPng(tileSize, tileSize, (x) => (
    x < tileSize / 2 ? [220, 20, 20, 255] : [20, 40, 220, 255]
  ));
}

export async function createMismatchedEdgeSheetPng(tileSize: TileSize = 16): Promise<Buffer> {
  const dimension = tileSize * SHEET_GRID_SIZE;
  return rawRgbaPng(dimension, dimension, (x) => (
    x % tileSize < tileSize / 2 ? [220, 20, 20, 255] : [20, 40, 220, 255]
  ));
}

export async function createPropOnFlatBackgroundPng(tileSize: TileSize = 16): Promise<Buffer> {
  const dimension = tileSize * SHEET_GRID_SIZE;
  const inset = Math.max(2, Math.floor(tileSize / 4));
  return rawRgbaPng(dimension, dimension, (x, y) => {
    const localX = x % tileSize;
    const localY = y % tileSize;
    const inside = (
      localX >= inset
      && localX < tileSize - inset
      && localY >= inset
      && localY < tileSize - inset
    );
    return inside ? [200, 40, 40, 255] : [20, 180, 40, 255];
  });
}
