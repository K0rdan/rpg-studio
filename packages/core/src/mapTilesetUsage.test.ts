import { describe, it, expect } from 'vitest';
import { encodeTileRef } from './tileRef';
import { mapUsesTileset } from './mapTilesetUsage';
import type { Map } from '@packages/types';

const emptyLayer = (size: number) => new Array<number>(size).fill(-1);

function makeMap(overrides: Partial<Map> = {}): Map {
  return {
    id: 'map-1',
    name: 'Map',
    width: 2,
    height: 1,
    tilesetId: 'grass',
    tilesetIds: ['grass'],
    layers: [{ name: 'Ground', data: emptyLayer(2) }],
    ...overrides,
  };
}

describe('mapUsesTileset', () => {
  it('counts the default tileset even when no tiles are painted', () => {
    expect(mapUsesTileset(makeMap(), 'grass')).toBe(true);
    expect(mapUsesTileset(makeMap(), 'trees')).toBe(false);
  });

  it('counts an extra tileset only while a cell still encodes it', () => {
    const withTrees: Map = {
      ...makeMap(),
      tilesetIds: ['grass', 'trees'],
      layers: [{ name: 'Ground', data: [0, encodeTileRef(1, 4)] }],
    };

    expect(mapUsesTileset(withTrees, 'trees')).toBe(true);

    const erased: Map = {
      ...withTrees,
      layers: [{ name: 'Ground', data: [0, -1] }],
    };
    expect(mapUsesTileset(erased, 'trees')).toBe(false);
  });

  it('treats a legacy tilesetId-only map as using that tileset', () => {
    expect(mapUsesTileset(makeMap({ tilesetIds: undefined }), 'grass')).toBe(true);
  });
});
