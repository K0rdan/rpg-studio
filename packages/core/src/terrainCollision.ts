import type { Layer, Map, Tileset } from '@packages/types';
import { resolveLayerRenderPriority } from './MapRenderer';

/** Layer data value for a cell with no tile painted on it. Never blocking. */
export const EMPTY_TILE = -1;

/** Map fields terrain collision reads. Keeps the editor overlay free of a full `Map`. */
export type CollisionMap = Pick<Map, 'width' | 'height' | 'layers'>;

/** Tileset fields terrain collision reads. */
export type CollisionTileset = Pick<Tileset, 'tiles'>;

export interface CellCoordinate {
  x: number;
  y: number;
}

export interface TilePosition {
  x: number;
  y: number;
}

/** Map and tileset a moving actor is resolved against. */
export interface TerrainCollisionContext {
  map: CollisionMap;
  tileset: CollisionTileset | null;
}

/**
 * Only visible below layers feed terrain collision: same-depth and above layers
 * exist to overlap actors, so blocking them would trap the player under scenery.
 * Missing `visible`/`priority` predate those fields and behave as visible below.
 */
export function participatesInCollision(layer: Pick<Layer, 'visible' | 'priority'>): boolean {
  return layer.visible !== false && resolveLayerRenderPriority(layer) === 'below';
}

/** Blocking marks are sparse: an absent entry or a falsy flag is walkable. */
function isTileCollidable(tileset: CollisionTileset | null | undefined, tileId: number): boolean {
  if (tileId === EMPTY_TILE) return false;
  return tileset?.tiles?.some((tile) => tile.id === tileId && tile.is_collidable === true) === true;
}

/** A cell blocks movement when it is off the map or any participating layer paints a blocking tile. */
export function isCellBlocked(
  map: CollisionMap,
  tileset: CollisionTileset | null | undefined,
  x: number,
  y: number
): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;

  const index = y * map.width + x;

  return map.layers.some((layer) => {
    if (!participatesInCollision(layer)) return false;
    const tileId = layer.data[index];
    return tileId !== undefined && isTileCollidable(tileset, tileId);
  });
}

/** Every in-bounds cell that currently blocks movement, in row-major order. */
export function blockedCells(
  map: CollisionMap,
  tileset: CollisionTileset | null | undefined
): CellCoordinate[] {
  const cells: CellCoordinate[] = [];

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (isCellBlocked(map, tileset, x, y)) cells.push({ x, y });
    }
  }

  return cells;
}

/**
 * Cells overlapped by the 1x1 tile AABB `[x, x + 1) x [y, y + 1)`.
 *
 * The interval is half-open, so a tile-aligned position occupies exactly one cell
 * and a straddling position occupies the two (or four) cells it actually covers.
 */
export function occupiedCells(x: number, y: number): CellCoordinate[] {
  const minX = Math.floor(x);
  const maxX = Math.ceil(x + 1) - 1;
  const minY = Math.floor(y);
  const maxY = Math.ceil(y + 1) - 1;

  const cells: CellCoordinate[] = [];

  for (let cellY = minY; cellY <= maxY; cellY += 1) {
    for (let cellX = minX; cellX <= maxX; cellX += 1) {
      cells.push({ x: cellX, y: cellY });
    }
  }

  return cells;
}

function cellKey(cell: CellCoordinate): string {
  return `${cell.x},${cell.y}`;
}

/**
 * Whether an actor at `from` may take the whole step to `to`.
 *
 * Cells the actor already overlaps are ignored, so painting a blocking tile under
 * someone does not freeze them: they are only stopped from entering new blockers.
 */
export function isMoveAllowed(
  map: CollisionMap,
  tileset: CollisionTileset | null | undefined,
  from: TilePosition,
  to: TilePosition
): boolean {
  const alreadyOccupied = new Set(occupiedCells(from.x, from.y).map(cellKey));

  return occupiedCells(to.x, to.y).every((cell) => {
    if (alreadyOccupied.has(cellKey(cell))) return true;
    return !isCellBlocked(map, tileset, cell.x, cell.y);
  });
}

/**
 * Resolve a proposed move one axis at a time, X first, so a diagonal step into a
 * corner keeps travelling along whichever axis is free instead of stopping dead.
 */
export function resolveMovement(
  map: CollisionMap,
  tileset: CollisionTileset | null | undefined,
  from: TilePosition,
  to: TilePosition
): TilePosition {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(deltaX), Math.abs(deltaY)) / 0.25));
  const stepX = deltaX / steps;
  const stepY = deltaY / steps;
  let { x, y } = from;

  for (let step = 0; step < steps; step += 1) {
    if (isMoveAllowed(map, tileset, { x, y }, { x: x + stepX, y })) {
      x += stepX;
    }

    if (isMoveAllowed(map, tileset, { x, y }, { x, y: y + stepY })) {
      y += stepY;
    }
  }

  return { x, y };
}
