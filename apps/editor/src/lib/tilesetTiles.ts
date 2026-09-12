import type { Db } from 'mongodb';
import type { TileProperties, Tileset } from '@packages/types';

/**
 * Registry tilesets live in `config/tilesets.ts` and cannot be written to, so their collision
 * marks are stored per project in this collection and merged back on read.
 */
export const TILESET_OVERLAY_COLLECTION = 'tilesetCollisionOverlays';

export type TilesetOverlays = ReadonlyMap<string, TileProperties[]>;

export type TilesetTilesPayload =
  | { ok: true; tiles: TileProperties[] }
  | { ok: false; message: string };

/**
 * Storage stays sparse: only tiles that block movement are kept, so an omitted or empty array
 * means every tile is walkable. Later entries win over earlier ones for the same id.
 */
export function normalizeTilesetTiles(value: unknown): TileProperties[] {
  if (!Array.isArray(value)) return [];

  const collidable = new Map<number, TileProperties>();

  for (const entry of value) {
    const id = readTileId(entry);
    if (id === null) continue;

    if ((entry as TileProperties).is_collidable === true) {
      collidable.set(id, { id, is_collidable: true });
    } else {
      collidable.delete(id);
    }
  }

  return sortById([...collidable.values()]);
}

/**
 * Strict check for request bodies: anything that is not an array of integer ids is rejected
 * instead of being silently dropped the way read paths do.
 */
export function validateTilesetTiles(value: unknown): TilesetTilesPayload {
  if (!Array.isArray(value)) {
    return { ok: false, message: 'tiles must be an array' };
  }

  for (const entry of value) {
    if (readTileId(entry) === null) {
      return { ok: false, message: 'each tile must have an integer id >= 0' };
    }

    const isCollidable = (entry as { is_collidable?: unknown }).is_collidable;
    if (isCollidable !== undefined && typeof isCollidable !== 'boolean') {
      return { ok: false, message: 'is_collidable must be a boolean' };
    }
  }

  return { ok: true, tiles: normalizeTilesetTiles(value) };
}

export function setTileCollidable(
  tiles: TileProperties[] | undefined,
  id: number,
  isCollidable: boolean,
): TileProperties[] {
  const next = normalizeTilesetTiles(tiles).filter((tile) => tile.id !== id);

  if (isCollidable && Number.isInteger(id) && id >= 0) {
    next.push({ id, is_collidable: true });
  }

  return sortById(next);
}

export function isTileCollidable(tiles: TileProperties[] | undefined, id: number): boolean {
  return normalizeTilesetTiles(tiles).some((tile) => tile.id === id);
}

export function withTilesetTiles<T extends Tileset>(
  tileset: T,
  tiles?: unknown,
): T & { tiles: TileProperties[] } {
  return { ...tileset, tiles: normalizeTilesetTiles(tiles ?? tileset.tiles) };
}

export function applyTilesetOverlays<T extends Tileset>(
  tilesets: T[],
  overlays: TilesetOverlays,
): (T & { tiles: TileProperties[] })[] {
  return tilesets.map((tileset) => withTilesetTiles(tileset, overlays.get(tileset.id)));
}

export async function loadTilesetOverlays(db: Db, projectId: string): Promise<TilesetOverlays> {
  const records = await db
    .collection(TILESET_OVERLAY_COLLECTION)
    .find({ projectId })
    .toArray();

  return new Map(
    records.map((record) => [String(record.tilesetId), normalizeTilesetTiles(record.tiles)]),
  );
}

export async function loadTilesetOverlay(
  db: Db,
  projectId: string,
  tilesetId: string,
): Promise<TileProperties[] | undefined> {
  const record = await db
    .collection(TILESET_OVERLAY_COLLECTION)
    .findOne({ projectId, tilesetId });

  return record ? normalizeTilesetTiles(record.tiles) : undefined;
}

export async function saveTilesetOverlay(
  db: Db,
  projectId: string,
  tilesetId: string,
  tiles: TileProperties[],
): Promise<TileProperties[]> {
  const normalized = normalizeTilesetTiles(tiles);

  await db.collection(TILESET_OVERLAY_COLLECTION).updateOne(
    { projectId, tilesetId },
    { $set: { projectId, tilesetId, tiles: normalized, updatedAt: new Date() } },
    { upsert: true },
  );

  return normalized;
}

function readTileId(entry: unknown): number | null {
  if (!entry || typeof entry !== 'object') return null;

  const id = (entry as { id?: unknown }).id;
  if (!Number.isInteger(id) || (id as number) < 0) return null;

  return id as number;
}

function sortById(tiles: TileProperties[]): TileProperties[] {
  return tiles.sort((a, b) => a.id - b.id);
}
