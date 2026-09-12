import type { Map } from '@packages/types';

export interface PaintTileInput {
  layerIndex: number;
  x: number;
  y: number;
  tileIndex: number;
}

/**
 * Returns a copy of the map with a single tile repainted. The map is returned
 * untouched when the target layer or coordinates fall outside the grid, so
 * callers can paint blindly while dragging.
 */
export const paintTileOnMap = (map: Map, { layerIndex, x, y, tileIndex }: PaintTileInput): Map => {
  const layer = map.layers[layerIndex];
  if (!layer) return map;
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return map;

  const index = y * map.width + x;
  if (index < 0 || index >= layer.data.length) return map;
  if (layer.data[index] === tileIndex) return map;

  const data = [...layer.data];
  data[index] = tileIndex;

  return {
    ...map,
    layers: map.layers.map((current, idx) => (idx === layerIndex ? { ...current, data } : current)),
  };
};
