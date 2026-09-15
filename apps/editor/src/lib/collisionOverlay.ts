import { blockedCells, blockingRects } from '@packages/core';
import type { CollisionRect, Map, Tileset } from '@packages/types';

export interface CollisionOverlayCell {
  x: number;
  y: number;
}

export function collisionOverlayCells(
  map: Map,
  tileset: Tileset,
): CollisionOverlayCell[] {
  return blockedCells(map, tileset);
}

export function collisionOverlayRects(
  map: Map,
  tileset: Tileset,
): CollisionRect[] {
  return blockingRects(map, tileset);
}
