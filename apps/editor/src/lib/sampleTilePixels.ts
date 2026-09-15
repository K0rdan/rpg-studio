import type { Tileset } from '@packages/types';

export function sampleTilePixels(
  image: HTMLImageElement,
  tileIndex: number,
  tileset: Pick<Tileset, 'tile_width' | 'tile_height' | 'source_tile_width' | 'source_tile_height'>,
): ImageData | null {
  const sourceTileWidth = tileset.source_tile_width || tileset.tile_width;
  const sourceTileHeight = tileset.source_tile_height || tileset.tile_height;
  const columns = Math.floor(image.width / sourceTileWidth);
  if (columns <= 0 || sourceTileWidth <= 0 || sourceTileHeight <= 0) return null;

  const sx = (tileIndex % columns) * sourceTileWidth;
  const sy = Math.floor(tileIndex / columns) * sourceTileHeight;
  const canvas = document.createElement('canvas');
  canvas.width = sourceTileWidth;
  canvas.height = sourceTileHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(
    image,
    sx,
    sy,
    sourceTileWidth,
    sourceTileHeight,
    0,
    0,
    sourceTileWidth,
    sourceTileHeight,
  );

  try {
    return ctx.getImageData(0, 0, sourceTileWidth, sourceTileHeight);
  } catch {
    return null;
  }
}
