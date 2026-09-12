import type { Map } from '@packages/types';
import {
  addMapLayer,
  clampActiveLayer,
  hasPaintedTiles,
  moveMapLayer,
  normalizeMapLayers,
  removeMapLayer,
  renameMapLayer,
  resizeMapLayers,
  setMapLayerPriority,
  toggleMapLayerVisibility,
} from './mapLayers';

const makeMap = (): Map => ({
  id: 'map-1',
  name: 'Test Map',
  width: 2,
  height: 2,
  tilesetId: 'tileset-1',
  layers: [
    { name: 'Ground', data: [1, -1, -1, -1] },
    { name: 'Objects', data: [-1, 2, -1, -1] },
  ],
});

describe('map layer operations', () => {
  it('adds a selected, visible, empty layer above existing layers', () => {
    const result = addMapLayer(makeMap());

    expect(result.activeLayer).toBe(2);
    expect(result.map.layers[2]).toEqual({
      name: 'Layer 3',
      data: [-1, -1, -1, -1],
      visible: true,
      priority: 'below',
    });
  });

  it('renames a layer with a trimmed non-empty name', () => {
    const map = makeMap();

    expect(renameMapLayer(map, 1, '  Decorations  ').layers[1].name).toBe('Decorations');
    expect(renameMapLayer(map, 1, '   ')).toBe(map);
  });

  it('does not remove the final layer', () => {
    const map = { ...makeMap(), layers: [makeMap().layers[0]] };

    expect(removeMapLayer(map, 0, 0).map).toBe(map);
  });

  it('keeps active selection valid after removal', () => {
    const result = removeMapLayer(makeMap(), 0, 1);

    expect(result.map.layers.map((layer) => layer.name)).toEqual(['Objects']);
    expect(result.activeLayer).toBe(0);
  });

  it('keeps the same logical layer active when layers move', () => {
    const map = makeMap();
    const movedActive = moveMapLayer(map, 0, 'up', 0);
    const movedNeighbor = moveMapLayer(map, 0, 'up', 1);

    expect(movedActive.map.layers.map((layer) => layer.name)).toEqual(['Objects', 'Ground']);
    expect(movedActive.activeLayer).toBe(1);
    expect(movedNeighbor.activeLayer).toBe(0);
  });

  it('toggles effective visibility without changing tile data', () => {
    const map = makeMap();
    const hidden = toggleMapLayerVisibility(map, 0);
    const visible = toggleMapLayerVisibility(hidden, 0);

    expect(hidden.layers[0].visible).toBe(false);
    expect(hidden.layers[0].data).toBe(map.layers[0].data);
    expect(visible.layers[0].visible).toBe(true);
  });

  it('sets render priority without changing the layer tile data', () => {
    const map = makeMap();
    const updated = setMapLayerPriority(map, 1, 'above');

    expect(updated.layers[1].priority).toBe('above');
    expect(updated.layers[1].data).toBe(map.layers[1].data);
    expect(setMapLayerPriority(updated, 1, 'above')).toBe(updated);
  });

  it('resizes every layer while preserving overlapping coordinates', () => {
    const resized = resizeMapLayers(makeMap(), 3, 3);

    expect(resized.layers[0].data).toEqual([1, -1, -1, -1, -1, -1, -1, -1, -1]);
    expect(resized.layers[1].data).toEqual([-1, 2, -1, -1, -1, -1, -1, -1, -1]);
  });

  it('normalizes missing and incorrectly sized layer data', () => {
    const missingLayers = { ...makeMap(), layers: [] };
    const shortData = { ...makeMap(), layers: [{ name: 'Ground', data: [4] }] };

    expect(normalizeMapLayers(missingLayers).layers).toEqual([
      {
        name: 'Layer 1',
        data: [-1, -1, -1, -1],
        visible: true,
        priority: 'below',
      },
    ]);
    expect(normalizeMapLayers(shortData).layers[0].data).toEqual([4, -1, -1, -1]);
  });

  it('clamps active indices and detects painted content', () => {
    expect(clampActiveLayer(makeMap(), 8)).toBe(1);
    expect(clampActiveLayer(makeMap(), -2)).toBe(0);
    expect(hasPaintedTiles(makeMap().layers[0])).toBe(true);
    expect(hasPaintedTiles({ name: 'Empty', data: [-1, -1] })).toBe(false);
  });
});
