import type { Map } from '@packages/types';
import { EMPTY_TILE, encodeTileRef, resolveMapTilesetIds } from '@packages/core';

export interface PaintTileInput {
  layerIndex: number;
  x: number;
  y: number;
  tileIndex: number;
  tilesetId?: string;
}

export function registerTilesetOnMap(map: Map, tilesetId: string): { map: Map; tilesetIndex: number } {
  if (!tilesetId) {
    return { map, tilesetIndex: 0 };
  }

  const ids = [...resolveMapTilesetIds(map)];
  const existing = ids.indexOf(tilesetId);
  if (existing >= 0) {
    const tilesetIds = map.tilesetIds ?? ids;
    if (map.tilesetId === (tilesetIds[0] ?? '') && map.tilesetIds === tilesetIds) {
      return { map, tilesetIndex: existing };
    }
    return {
      map: { ...map, tilesetId: tilesetIds[0] ?? map.tilesetId, tilesetIds },
      tilesetIndex: existing,
    };
  }

  const tilesetIds = [...ids, tilesetId];
  return {
    map: { ...map, tilesetId: tilesetIds[0] ?? '', tilesetIds },
    tilesetIndex: tilesetIds.length - 1,
  };
}

export function applyDefaultTilesetId(map: Map, tilesetId: string): Map {
  const ids = [...resolveMapTilesetIds(map)];
  if (!tilesetId) {
    return { ...map, tilesetId: '' };
  }
  if (ids.length === 0) {
    return { ...map, tilesetId, tilesetIds: [tilesetId] };
  }
  ids[0] = tilesetId;
  return { ...map, tilesetId, tilesetIds: ids };
}

/**
 * Returns a copy of the map with a single tile repainted. The map is returned
 * untouched when the target layer or coordinates fall outside the grid, so
 * callers can paint blindly while dragging.
 */
export const paintTileOnMap = (map: Map, input: PaintTileInput): Map => {
  const { layerIndex, x, y, tileIndex, tilesetId } = input;
  const layer = map.layers[layerIndex];
  if (!layer) return map;
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return map;

  const index = y * map.width + x;
  if (index < 0 || index >= layer.data.length) return map;

  let nextMap = map;
  let packed = tileIndex;
  if (tileIndex !== EMPTY_TILE && tilesetId) {
    const registered = registerTilesetOnMap(map, tilesetId);
    nextMap = registered.map;
    packed = encodeTileRef(registered.tilesetIndex, tileIndex);
  }

  if (nextMap.layers[layerIndex].data[index] === packed) {
    return nextMap === map ? map : nextMap;
  }

  const data = [...nextMap.layers[layerIndex].data];
  data[index] = packed;

  return {
    ...nextMap,
    layers: nextMap.layers.map((current, idx) => (idx === layerIndex ? { ...current, data } : current)),
  };
};

export const FIXED_BLOCK_STAMP_SIZE = 8;

export const paintStampOnMap = (
  map: Map,
  input: PaintTileInput & { columns?: number; rows?: number },
): Map => {
  const columns = input.columns ?? FIXED_BLOCK_STAMP_SIZE;
  const rows = input.rows ?? FIXED_BLOCK_STAMP_SIZE;
  let next = map;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      next = paintTileOnMap(next, {
        ...input,
        x: input.x + column,
        y: input.y + row,
        tileIndex: row * columns + column,
      });
    }
  }
  return next;
};

export function isFixedBlockTileset(tileset: { generation_metadata?: { tilingMode?: string } } | null | undefined): boolean {
  return tileset?.generation_metadata?.tilingMode === 'fixed-block';
}
