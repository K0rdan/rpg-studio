import type { Map } from '@packages/types';
import { mapSavePayload } from './mapSavePayload';

const makeMap = (overrides: Partial<Map> = {}): Map => ({
  id: 'map-1',
  name: 'Map 1',
  width: 2,
  height: 1,
  tilesetId: 'grass',
  tilesetIds: ['grass'],
  layers: [{ name: 'Ground', data: [0, -1] }],
  ...overrides,
});

describe('mapSavePayload', () => {
  it('ships every tileset painted on the map', () => {
    const map = makeMap({
      tilesetIds: ['grass', 'water'],
      layers: [{ name: 'Ground', data: [0, (1 << 16) | 3] }],
    });

    expect(mapSavePayload(map)).toEqual({
      layers: map.layers,
      width: 2,
      height: 1,
      tilesetId: 'grass',
      tilesetIds: ['grass', 'water'],
    });
  });

  it('derives the list from a legacy map that only has tilesetId', () => {
    expect(mapSavePayload(makeMap({ tilesetIds: undefined }))).toMatchObject({
      tilesetId: 'grass',
      tilesetIds: ['grass'],
    });
  });

  it('keeps an empty list when the map has no tileset yet', () => {
    expect(mapSavePayload(makeMap({ tilesetId: '', tilesetIds: undefined }))).toMatchObject({
      tilesetId: '',
      tilesetIds: [],
    });
  });
});
