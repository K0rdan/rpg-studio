import { describe, it, expect } from 'vitest';
import type { Layer, Map, Tileset } from '@packages/types';
import {
  EMPTY_TILE,
  blockedCells,
  isCellBlocked,
  isMoveAllowed,
  occupiedCells,
  participatesInCollision,
  resolveMovement,
} from './terrainCollision';

const WALL = 7;
const FLOOR = 3;

/** 3x3 layer data with `WALL` at the given cells and `FLOOR` everywhere else. */
function floorWithWalls(...walls: Array<[number, number]>): number[] {
  const data = new Array<number>(9).fill(FLOOR);
  walls.forEach(([x, y]) => {
    data[y * 3 + x] = WALL;
  });
  return data;
}

function makeLayer(overrides: Partial<Layer> = {}): Layer {
  return {
    name: 'Ground',
    data: floorWithWalls(),
    ...overrides,
  };
}

function makeMap(layers: Layer[]): Map {
  return {
    id: 'map-1',
    name: 'Test Map',
    width: 3,
    height: 3,
    tilesetId: 'tileset-1',
    layers,
  };
}

function makeTileset(overrides: Partial<Tileset> = {}): Tileset {
  return {
    id: 'tileset-1',
    name: 'Test Tileset',
    image_source: '/tileset.png',
    tile_width: 32,
    tile_height: 32,
    tiles: [{ id: WALL, is_collidable: true }],
    ...overrides,
  };
}

describe('participatesInCollision', () => {
  it('accepts a layer with no visibility and no priority (legacy below layer)', () => {
    expect(participatesInCollision(makeLayer())).toBe(true);
  });

  it('accepts an explicit visible below layer', () => {
    expect(participatesInCollision(makeLayer({ visible: true, priority: 'below' }))).toBe(true);
  });

  it('rejects hidden layers', () => {
    expect(participatesInCollision(makeLayer({ visible: false, priority: 'below' }))).toBe(false);
  });

  it('rejects same-depth and above layers', () => {
    expect(participatesInCollision(makeLayer({ priority: 'same' }))).toBe(false);
    expect(participatesInCollision(makeLayer({ priority: 'above' }))).toBe(false);
  });
});

describe('isCellBlocked', () => {
  it('blocks a cell painted with a collidable tile on a below layer', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([1, 1]) })]);

    expect(isCellBlocked(map, makeTileset(), 1, 1)).toBe(true);
  });

  it('allows a cell painted with a tile that has no blocking mark', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([1, 1]) })]);

    expect(isCellBlocked(map, makeTileset(), 0, 0)).toBe(false);
  });

  it('treats the empty tile index as walkable even when that index is marked', () => {
    const map = makeMap([makeLayer({ data: new Array<number>(9).fill(EMPTY_TILE) })]);
    const tileset = makeTileset({ tiles: [{ id: EMPTY_TILE, is_collidable: true }] });

    expect(isCellBlocked(map, tileset, 1, 1)).toBe(false);
  });

  it('treats a tileset without a tiles array as fully walkable', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([1, 1]) })]);

    expect(isCellBlocked(map, makeTileset({ tiles: undefined }), 1, 1)).toBe(false);
  });

  it('treats an empty tiles array and a missing tileset as fully walkable', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([1, 1]) })]);

    expect(isCellBlocked(map, makeTileset({ tiles: [] }), 1, 1)).toBe(false);
    expect(isCellBlocked(map, null, 1, 1)).toBe(false);
  });

  it('treats is_collidable false as walkable', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([1, 1]) })]);
    const tileset = makeTileset({ tiles: [{ id: WALL, is_collidable: false }] });

    expect(isCellBlocked(map, tileset, 1, 1)).toBe(false);
  });

  it('blocks when any stacked below layer has a collidable tile in that cell', () => {
    const map = makeMap([
      makeLayer({ name: 'Ground' }),
      makeLayer({ name: 'Walls', data: floorWithWalls([2, 0]) }),
    ]);

    expect(isCellBlocked(map, makeTileset(), 2, 0)).toBe(true);
  });

  it('ignores collidable tiles on hidden below layers', () => {
    const map = makeMap([
      makeLayer({ name: 'Walls', data: floorWithWalls([1, 1]), visible: false }),
    ]);

    expect(isCellBlocked(map, makeTileset(), 1, 1)).toBe(false);
  });

  it('ignores collidable tiles on same-depth layers', () => {
    const map = makeMap([
      makeLayer({ name: 'Props', data: floorWithWalls([1, 1]), priority: 'same' }),
    ]);

    expect(isCellBlocked(map, makeTileset(), 1, 1)).toBe(false);
  });

  it('ignores collidable tiles on above layers', () => {
    const map = makeMap([
      makeLayer({ name: 'Canopy', data: floorWithWalls([1, 1]), priority: 'above' }),
    ]);

    expect(isCellBlocked(map, makeTileset(), 1, 1)).toBe(false);
  });

  it('keeps a below blocker when decoration stacks on same-depth and above layers', () => {
    const map = makeMap([
      makeLayer({ name: 'Walls', data: floorWithWalls([1, 1]) }),
      makeLayer({ name: 'Props', data: floorWithWalls(), priority: 'same' }),
      makeLayer({ name: 'Canopy', data: floorWithWalls(), priority: 'above' }),
    ]);

    expect(isCellBlocked(map, makeTileset(), 1, 1)).toBe(true);
  });

  it('blocks every cell outside the map bounds', () => {
    const map = makeMap([makeLayer()]);
    const tileset = makeTileset();

    expect(isCellBlocked(map, tileset, -1, 0)).toBe(true);
    expect(isCellBlocked(map, tileset, 0, -1)).toBe(true);
    expect(isCellBlocked(map, tileset, 3, 2)).toBe(true);
    expect(isCellBlocked(map, tileset, 2, 3)).toBe(true);
  });

  it('treats a cell missing from short layer data as walkable', () => {
    const map = makeMap([makeLayer({ data: [FLOOR] })]);

    expect(isCellBlocked(map, makeTileset(), 2, 2)).toBe(false);
  });
});

describe('blockedCells', () => {
  it('lists only in-bounds cells that currently block movement', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([0, 0], [2, 1]) })]);

    expect(blockedCells(map, makeTileset())).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 1 },
    ]);
  });

  it('returns an empty list when nothing is marked as blocking', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([0, 0]) })]);

    expect(blockedCells(map, makeTileset({ tiles: [] }))).toEqual([]);
  });

  it('drops cells whose only blocker is hidden, same-depth, or above', () => {
    const map = makeMap([
      makeLayer({ name: 'Hidden', data: floorWithWalls([0, 0]), visible: false }),
      makeLayer({ name: 'Props', data: floorWithWalls([1, 0]), priority: 'same' }),
      makeLayer({ name: 'Canopy', data: floorWithWalls([2, 0]), priority: 'above' }),
      makeLayer({ name: 'Walls', data: floorWithWalls([1, 2]) }),
    ]);

    expect(blockedCells(map, makeTileset())).toEqual([{ x: 1, y: 2 }]);
  });

  it('reports the union of stacked below layers without duplicates', () => {
    const map = makeMap([
      makeLayer({ name: 'Ground', data: floorWithWalls([1, 1]) }),
      makeLayer({ name: 'Walls', data: floorWithWalls([1, 1], [0, 2]) }),
    ]);

    expect(blockedCells(map, makeTileset())).toEqual([
      { x: 1, y: 1 },
      { x: 0, y: 2 },
    ]);
  });
});

describe('occupiedCells', () => {
  it('covers a single cell when the position is tile-aligned', () => {
    expect(occupiedCells(1, 2)).toEqual([{ x: 1, y: 2 }]);
  });

  it('covers two cells when the position straddles one axis', () => {
    expect(occupiedCells(1.5, 2)).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]);
  });

  it('covers four cells when the position straddles both axes', () => {
    expect(occupiedCells(0.25, 0.75)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
  });

  it('covers cells outside the map for negative positions', () => {
    expect(occupiedCells(-0.5, 0)).toEqual([
      { x: -1, y: 0 },
      { x: 0, y: 0 },
    ]);
  });
});

describe('isMoveAllowed', () => {
  it('allows a move into walkable cells', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([2, 2]) })]);

    expect(isMoveAllowed(map, makeTileset(), { x: 0, y: 0 }, { x: 0.5, y: 0 })).toBe(true);
  });

  it('rejects a move that overlaps a newly entered blocking cell', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([1, 0]) })]);

    expect(isMoveAllowed(map, makeTileset(), { x: 0, y: 0 }, { x: 0.1, y: 0 })).toBe(false);
  });

  it('rejects a move that leaves the map', () => {
    const map = makeMap([makeLayer()]);

    expect(isMoveAllowed(map, makeTileset(), { x: 0, y: 0 }, { x: -0.1, y: 0 })).toBe(false);
  });

  it('allows leaving a blocking cell the player already occupies', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([1, 1]) })]);

    expect(isMoveAllowed(map, makeTileset(), { x: 1, y: 1 }, { x: 1.2, y: 1 })).toBe(true);
    expect(isMoveAllowed(map, makeTileset(), { x: 1.2, y: 1 }, { x: 1.4, y: 1 })).toBe(true);
  });
});

describe('resolveMovement', () => {
  it('applies both axes when the target is walkable', () => {
    const map = makeMap([makeLayer()]);

    expect(resolveMovement(map, makeTileset(), { x: 0, y: 0 }, { x: 0.5, y: 0.5 })).toEqual({
      x: 0.5,
      y: 0.5,
    });
  });

  it('slides along Y when X is blocked', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([1, 0], [1, 1]) })]);

    expect(resolveMovement(map, makeTileset(), { x: 0, y: 0 }, { x: 0.5, y: 0.5 })).toEqual({
      x: 0,
      y: 0.5,
    });
  });

  it('slides along X when Y is blocked', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([0, 1], [1, 1]) })]);

    expect(resolveMovement(map, makeTileset(), { x: 0, y: 0 }, { x: 0.5, y: 0.5 })).toEqual({
      x: 0.5,
      y: 0,
    });
  });

  it('keeps the current position when both axes are blocked', () => {
    const map = makeMap([
      makeLayer({ data: floorWithWalls([1, 0], [0, 1], [1, 1]) }),
    ]);

    expect(resolveMovement(map, makeTileset(), { x: 0, y: 0 }, { x: 0.5, y: 0.5 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('resolves Y against the position already advanced on X', () => {
    // (2,1) blocks the diagonal target, but the X move to (1,0) is free and the
    // following Y move must be judged from there, not from the original cell.
    const map = makeMap([makeLayer({ data: floorWithWalls([2, 1]) })]);

    expect(resolveMovement(map, makeTileset(), { x: 1, y: 0 }, { x: 1.5, y: 0.5 })).toEqual({
      x: 1.5,
      y: 0,
    });
  });

  it('stops at the map edge instead of walking out of bounds', () => {
    const map = makeMap([makeLayer()]);

    expect(resolveMovement(map, makeTileset(), { x: 2, y: 2 }, { x: 2.5, y: 2.5 })).toEqual({
      x: 2,
      y: 2,
    });
  });

  it('does not tunnel through an intermediate wall during a long frame', () => {
    const map = makeMap([makeLayer({ data: floorWithWalls([2, 0]) })]);

    expect(resolveMovement(map, makeTileset(), { x: 0, y: 0 }, { x: 3, y: 0 })).toEqual({
      x: 1,
      y: 0,
    });
  });
});
