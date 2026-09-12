import type { Map } from '@packages/types';
import { paintTileOnMap } from './mapPainting';

const makeMap = (): Map => ({
  id: 'map-1',
  name: 'Map 1',
  width: 4,
  height: 3,
  tilesetId: 'tileset-1',
  layers: [
    { name: 'Layer 1', data: new Array(12).fill(-1) },
    { name: 'Layer 2', data: new Array(12).fill(-1) },
  ],
});

describe('paintTileOnMap', () => {
  it('writes the tile at the row-major index of the target layer', () => {
    const painted = paintTileOnMap(makeMap(), { layerIndex: 0, x: 2, y: 1, tileIndex: 7 });

    expect(painted.layers[0].data[6]).toBe(7);
  });

  it('leaves the other layers and the source map untouched', () => {
    const map = makeMap();

    const painted = paintTileOnMap(map, { layerIndex: 1, x: 0, y: 0, tileIndex: 3 });

    expect(painted.layers[1].data[0]).toBe(3);
    expect(painted.layers[0].data[0]).toBe(-1);
    expect(map.layers[1].data[0]).toBe(-1);
  });

  it('accumulates successive strokes instead of dropping them', () => {
    const first = paintTileOnMap(makeMap(), { layerIndex: 0, x: 0, y: 0, tileIndex: 1 });
    const second = paintTileOnMap(first, { layerIndex: 0, x: 1, y: 0, tileIndex: 2 });

    expect(second.layers[0].data.slice(0, 2)).toEqual([1, 2]);
  });

  it('ignores coordinates outside the grid', () => {
    const map = makeMap();

    expect(paintTileOnMap(map, { layerIndex: 0, x: 4, y: 0, tileIndex: 5 })).toBe(map);
    expect(paintTileOnMap(map, { layerIndex: 0, x: 0, y: 3, tileIndex: 5 })).toBe(map);
    expect(paintTileOnMap(map, { layerIndex: 0, x: -1, y: 0, tileIndex: 5 })).toBe(map);
  });

  it('ignores a layer that does not exist', () => {
    const map = makeMap();

    expect(paintTileOnMap(map, { layerIndex: 4, x: 0, y: 0, tileIndex: 5 })).toBe(map);
  });

  it('keeps the same map when the tile is already painted', () => {
    const map = paintTileOnMap(makeMap(), { layerIndex: 0, x: 0, y: 0, tileIndex: 9 });

    expect(paintTileOnMap(map, { layerIndex: 0, x: 0, y: 0, tileIndex: 9 })).toBe(map);
  });
});
