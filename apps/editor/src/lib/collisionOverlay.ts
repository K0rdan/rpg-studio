import { blockedCells } from '@packages/core';
import type { Map, Tileset } from '@packages/types';

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
