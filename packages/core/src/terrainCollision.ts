import type { CollisionRect, Layer, Map, Tileset } from '@packages/types';
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

/** Contact box relative to the entity origin, in tile space. */
export interface ActorHitbox {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export const FULL_TILE_HITBOX: ActorHitbox = {
  offsetX: 0,
  offsetY: 0,
  width: 1,
  height: 1,
};

/** Default player contact box: half a tile, centered, bottom-aligned in the origin cell. */
export const DEFAULT_PLAYER_HITBOX: ActorHitbox = {
  offsetX: 0.25,
  offsetY: 0.5,
  width: 0.5,
  height: 0.5,
};

export const FULL_TILE_RECT: CollisionRect = { x: 0, y: 0, width: 1, height: 1 };

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

export function actorAabb(position: TilePosition, hitbox: ActorHitbox): CollisionRect {
  return {
    x: position.x + hitbox.offsetX,
    y: position.y + hitbox.offsetY,
    width: hitbox.width,
    height: hitbox.height,
  };
}

export function aabbsOverlap(a: CollisionRect, b: CollisionRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function collidableTile(
  tileset: CollisionTileset | null | undefined,
  tileId: number,
): NonNullable<Tileset['tiles']>[number] | undefined {
  if (tileId === EMPTY_TILE) return undefined;
  return tileset?.tiles?.find((tile) => tile.id === tileId && tile.is_collidable === true);
}

function tileSolidInCell(
  tileset: CollisionTileset | null | undefined,
  tileId: number,
  cellX: number,
  cellY: number,
): CollisionRect | null {
  const tile = collidableTile(tileset, tileId);
  if (!tile) return null;

  const local = tile.collisionRect ?? FULL_TILE_RECT;
  return {
    x: cellX + local.x,
    y: cellY + local.y,
    width: local.width,
    height: local.height,
  };
}

/** Solids in map space for one cell, including a full cell when the cell is off the map. */
export function solidsAtCell(
  map: CollisionMap,
  tileset: CollisionTileset | null | undefined,
  cellX: number,
  cellY: number,
): CollisionRect[] {
  if (cellX < 0 || cellY < 0 || cellX >= map.width || cellY >= map.height) {
    return [{ x: cellX, y: cellY, width: 1, height: 1 }];
  }

  const index = cellY * map.width + cellX;
  const solids: CollisionRect[] = [];

  for (const layer of map.layers) {
    if (!participatesInCollision(layer)) continue;
    const tileId = layer.data[index];
    if (tileId === undefined) continue;
    const solid = tileSolidInCell(tileset, tileId, cellX, cellY);
    if (solid) solids.push(solid);
  }

  return solids;
}

/** Blocking marks are sparse: an absent entry or a falsy flag is walkable. */
function isTileCollidable(tileset: CollisionTileset | null | undefined, tileId: number): boolean {
  return collidableTile(tileset, tileId) !== undefined;
}

/** A cell blocks movement when it is off the map or any participating layer paints a blocking tile. */
export function isCellBlocked(
  map: CollisionMap,
  tileset: CollisionTileset | null | undefined,
  x: number,
  y: number,
): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;

  const index = y * map.width + x;

  return map.layers.some((layer) => {
    if (!participatesInCollision(layer)) return false;
    const tileId = layer.data[index];
    return tileId !== undefined && isTileCollidable(tileset, tileId);
  });
}

/** Every in-bounds cell that currently has at least one solid, in row-major order. */
export function blockedCells(
  map: CollisionMap,
  tileset: CollisionTileset | null | undefined,
): CellCoordinate[] {
  const cells: CellCoordinate[] = [];

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (isCellBlocked(map, tileset, x, y)) cells.push({ x, y });
    }
  }

  return cells;
}

/** In-bounds solid rectangles the overlay and runtime share. */
export function blockingRects(
  map: CollisionMap,
  tileset: CollisionTileset | null | undefined,
): CollisionRect[] {
  const rects: CollisionRect[] = [];

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      rects.push(...solidsAtCell(map, tileset, x, y));
    }
  }

  return rects;
}

/**
 * Cells overlapped by the AABB `[x, x + width) × [y, y + height)`.
 *
 * The interval is half-open, so a tile-aligned 1×1 box occupies exactly one cell
 * and a straddling box occupies the cells it actually covers.
 */
export function occupiedCells(
  x: number,
  y: number,
  hitbox: ActorHitbox = FULL_TILE_HITBOX,
): CellCoordinate[] {
  const box = actorAabb({ x, y }, hitbox);
  const minX = Math.floor(box.x);
  const maxX = Math.ceil(box.x + box.width) - 1;
  const minY = Math.floor(box.y);
  const maxY = Math.ceil(box.y + box.height) - 1;

  const cells: CellCoordinate[] = [];

  for (let cellY = minY; cellY <= maxY; cellY += 1) {
    for (let cellX = minX; cellX <= maxX; cellX += 1) {
      cells.push({ x: cellX, y: cellY });
    }
  }

  return cells;
}

function solidKey(solid: CollisionRect): string {
  return `${solid.x},${solid.y},${solid.width},${solid.height}`;
}

/**
 * Whether an actor at `from` may take the whole step to `to`.
 *
 * Solids the actor already overlaps are ignored, so painting a blocking tile under
 * someone does not freeze them: they are only stopped from entering new blockers.
 */
export function isMoveAllowed(
  map: CollisionMap,
  tileset: CollisionTileset | null | undefined,
  from: TilePosition,
  to: TilePosition,
  hitbox: ActorHitbox = FULL_TILE_HITBOX,
): boolean {
  const fromBox = actorAabb(from, hitbox);
  const toBox = actorAabb(to, hitbox);
  const alreadyOverlapping = new Set<string>();

  for (const cell of occupiedCells(from.x, from.y, hitbox)) {
    for (const solid of solidsAtCell(map, tileset, cell.x, cell.y)) {
      if (aabbsOverlap(fromBox, solid)) alreadyOverlapping.add(solidKey(solid));
    }
  }

  return occupiedCells(to.x, to.y, hitbox).every((cell) => {
    return solidsAtCell(map, tileset, cell.x, cell.y).every((solid) => {
      if (alreadyOverlapping.has(solidKey(solid))) return true;
      return !aabbsOverlap(toBox, solid);
    });
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
  to: TilePosition,
  hitbox: ActorHitbox = FULL_TILE_HITBOX,
): TilePosition {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(deltaX), Math.abs(deltaY)) / 0.25));
  const stepX = deltaX / steps;
  const stepY = deltaY / steps;
  let { x, y } = from;

  for (let step = 0; step < steps; step += 1) {
    if (isMoveAllowed(map, tileset, { x, y }, { x: x + stepX, y }, hitbox)) {
      x += stepX;
    }

    if (isMoveAllowed(map, tileset, { x, y }, { x, y: y + stepY }, hitbox)) {
      y += stepY;
    }
  }

  return { x, y };
}
