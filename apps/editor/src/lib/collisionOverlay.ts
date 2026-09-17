import {
  blockedCells,
  blockingRects,
  resolveMapTilesetIds,
  type CollisionTilesets,
} from '@packages/core';
import type { CollisionRect, Map, Tileset } from '@packages/types';

export interface CollisionOverlayCell {
  x: number;
  y: number;
}

export function collisionTilesetsForMap(
  map: Map,
  tilesets: Tileset[],
  editableTileset?: Tileset | null,
): Array<Tileset | null> {
  return resolveMapTilesetIds(map).map((id) => {
    if (editableTileset?.id === id) return editableTileset;
    return tilesets.find((tileset) => tileset.id === id) ?? null;
  });
}

export function collisionOverlayCells(
  map: Map,
  tilesets: CollisionTilesets,
): CollisionOverlayCell[] {
  return blockedCells(map, tilesets);
}

export function collisionOverlayRects(
  map: Map,
  tilesets: CollisionTilesets,
): CollisionRect[] {
  return blockingRects(map, tilesets);
}
