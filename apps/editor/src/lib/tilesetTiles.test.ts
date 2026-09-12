import type { Tileset } from '@packages/types';
import {
  applyTilesetOverlays,
  isTileCollidable,
  normalizeTilesetTiles,
  setTileCollidable,
  validateTilesetTiles,
  withTilesetTiles,
} from './tilesetTiles';

const makeTileset = (overrides: Partial<Tileset> = {}): Tileset => ({
  id: 'ts1',
  name: 'RPG Tileset',
  image_source: '/tileset_final.png',
  tile_width: 32,
  tile_height: 32,
  ...overrides,
});

describe('normalizeTilesetTiles', () => {
  it('treats a missing or empty tiles array as fully walkable', () => {
    expect(normalizeTilesetTiles(undefined)).toEqual([]);
    expect(normalizeTilesetTiles([])).toEqual([]);
  });

  it('keeps only blocking tiles so storage stays sparse', () => {
    expect(
      normalizeTilesetTiles([
        { id: 0, is_collidable: false },
        { id: 7, is_collidable: true },
        { id: 3 },
      ]),
    ).toEqual([{ id: 7, is_collidable: true }]);
  });

  it('drops entries that are not tiles with an integer id >= 0', () => {
    expect(
      normalizeTilesetTiles([
        { id: -1, is_collidable: true },
        { id: 1.5, is_collidable: true },
        { id: '4', is_collidable: true },
        null,
        { is_collidable: true },
        { id: 2, is_collidable: true },
      ]),
    ).toEqual([{ id: 2, is_collidable: true }]);
  });

  it('lets the last entry win for a duplicated id', () => {
    expect(
      normalizeTilesetTiles([
        { id: 5, is_collidable: true },
        { id: 5, is_collidable: false },
      ]),
    ).toEqual([]);

    expect(
      normalizeTilesetTiles([
        { id: 5, is_collidable: false },
        { id: 5, is_collidable: true },
      ]),
    ).toEqual([{ id: 5, is_collidable: true }]);
  });

  it('orders tiles by id', () => {
    expect(
      normalizeTilesetTiles([
        { id: 9, is_collidable: true },
        { id: 2, is_collidable: true },
      ]),
    ).toEqual([
      { id: 2, is_collidable: true },
      { id: 9, is_collidable: true },
    ]);
  });
});

describe('validateTilesetTiles', () => {
  it('rejects payloads that are not arrays', () => {
    expect(validateTilesetTiles(undefined).ok).toBe(false);
    expect(validateTilesetTiles({ id: 1 }).ok).toBe(false);
  });

  it('rejects ids that are not integers >= 0', () => {
    expect(validateTilesetTiles([{ id: -1, is_collidable: true }]).ok).toBe(false);
    expect(validateTilesetTiles([{ id: 2.5, is_collidable: true }]).ok).toBe(false);
    expect(validateTilesetTiles([{ id: '3', is_collidable: true }]).ok).toBe(false);
    expect(validateTilesetTiles([{ is_collidable: true }]).ok).toBe(false);
  });

  it('rejects a non-boolean is_collidable', () => {
    expect(validateTilesetTiles([{ id: 1, is_collidable: 'yes' }]).ok).toBe(false);
  });

  it('accepts a valid payload and returns the sparse tiles to store', () => {
    expect(
      validateTilesetTiles([
        { id: 4, is_collidable: true },
        { id: 5, is_collidable: false },
      ]),
    ).toEqual({ ok: true, tiles: [{ id: 4, is_collidable: true }] });
  });
});

describe('setTileCollidable', () => {
  it('marks a tile blocking without touching the others', () => {
    expect(setTileCollidable([{ id: 1, is_collidable: true }], 4, true)).toEqual([
      { id: 1, is_collidable: true },
      { id: 4, is_collidable: true },
    ]);
  });

  it('removes the entry when a tile becomes walkable again', () => {
    expect(
      setTileCollidable(
        [
          { id: 1, is_collidable: true },
          { id: 4, is_collidable: true },
        ],
        4,
        false,
      ),
    ).toEqual([{ id: 1, is_collidable: true }]);
  });

  it('does not duplicate a tile that is already blocking', () => {
    expect(setTileCollidable([{ id: 4, is_collidable: true }], 4, true)).toEqual([
      { id: 4, is_collidable: true },
    ]);
  });

  it('starts from an empty list when the tileset has no tiles yet', () => {
    expect(setTileCollidable(undefined, 0, true)).toEqual([{ id: 0, is_collidable: true }]);
  });
});

describe('isTileCollidable', () => {
  it('reports blocking tiles and defaults everything else to walkable', () => {
    const tiles = [{ id: 7, is_collidable: true }];

    expect(isTileCollidable(tiles, 7)).toBe(true);
    expect(isTileCollidable(tiles, 8)).toBe(false);
    expect(isTileCollidable(undefined, 7)).toBe(false);
  });
});

describe('withTilesetTiles', () => {
  it('always exposes a tiles array', () => {
    expect(withTilesetTiles(makeTileset()).tiles).toEqual([]);
  });

  it('keeps the tiles already on the tileset when no override is given', () => {
    const tileset = makeTileset({ tiles: [{ id: 2, is_collidable: true }] });

    expect(withTilesetTiles(tileset).tiles).toEqual([{ id: 2, is_collidable: true }]);
  });

  it('replaces the tiles when an override is given', () => {
    const tileset = makeTileset({ tiles: [{ id: 2, is_collidable: true }] });

    expect(withTilesetTiles(tileset, [{ id: 3, is_collidable: true }]).tiles).toEqual([
      { id: 3, is_collidable: true },
    ]);
  });
});

describe('applyTilesetOverlays', () => {
  it('merges the project overlay onto the matching registry tileset only', () => {
    const overlays = new Map([['ts1', [{ id: 6, is_collidable: true }]]]);

    const merged = applyTilesetOverlays([makeTileset(), makeTileset({ id: 'ts2' })], overlays);

    expect(merged[0].tiles).toEqual([{ id: 6, is_collidable: true }]);
    expect(merged[1].tiles).toEqual([]);
  });

  it('leaves the registry tiles in place when the project has no overlay', () => {
    const tileset = makeTileset({ tiles: [{ id: 1, is_collidable: true }] });

    expect(applyTilesetOverlays([tileset], new Map())[0].tiles).toEqual([
      { id: 1, is_collidable: true },
    ]);
  });
});
