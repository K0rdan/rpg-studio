import { blockedCells } from '@packages/core';
import type { Map, Tileset } from '@packages/types';
import { collisionOverlayCells } from './collisionOverlay';

jest.mock('@packages/core', () => ({
  blockedCells: jest.fn(),
}));

const map: Map = {
  id: 'map-1',
  name: 'Map',
  width: 2,
  height: 2,
  tilesetId: 'tileset-1',
  layers: [{ name: 'Ground', data: [1, -1, -1, -1] }],
};

const tileset: Tileset = {
  id: 'tileset-1',
  name: 'Tileset',
  image_source: '/tiles.png',
  tile_width: 32,
  tile_height: 32,
  tiles: [{ id: 1, is_collidable: true }],
};

describe('collisionOverlayCells', () => {
  beforeEach(() => {
    jest.mocked(blockedCells).mockReset();
  });

  it('delegates collision derivation to core', () => {
    const cells = [{ x: 0, y: 0 }];
    jest.mocked(blockedCells).mockReturnValue(cells);

    expect(collisionOverlayCells(map, tileset)).toBe(cells);
    expect(blockedCells).toHaveBeenCalledWith(map, tileset);
  });

  it('requests a fresh result when map layers or tileset marks change', () => {
    jest.mocked(blockedCells)
      .mockReturnValueOnce([{ x: 0, y: 0 }])
      .mockReturnValueOnce([]);

    const hiddenMap: Map = {
      ...map,
      layers: [{ ...map.layers[0], visible: false }],
    };
    const walkableTileset: Tileset = { ...tileset, tiles: [] };

    expect(collisionOverlayCells(map, tileset)).toEqual([{ x: 0, y: 0 }]);
    expect(collisionOverlayCells(hiddenMap, walkableTileset)).toEqual([]);
    expect(blockedCells).toHaveBeenNthCalledWith(1, map, tileset);
    expect(blockedCells).toHaveBeenNthCalledWith(2, hiddenMap, walkableTileset);
  });
});
