import type { Map } from '@packages/types';
import {
  emptyCellsForActiveLayer,
  resolveLayerDrawMode,
  shouldShowEmptyCellMarkers,
} from './layerFocus';

const layers = [
  { name: 'Ground', visible: true as const },
  { name: 'Decor', visible: true as const },
  { name: 'Hidden', visible: false as const },
];

describe('resolveLayerDrawMode', () => {
  it('draws the selected visible layer at full strength and subdues other visible layers', () => {
    expect(resolveLayerDrawMode(layers, 1, { activeLayer: 1, isolate: false })).toBe('full');
    expect(resolveLayerDrawMode(layers, 0, { activeLayer: 1, isolate: false })).toBe('subdued');
  });

  it('skips hidden layers while focus is active', () => {
    expect(resolveLayerDrawMode(layers, 2, { activeLayer: 1, isolate: false })).toBe('skip');
  });

  it('does not subdue when fewer than two layers are visible', () => {
    const singleVisible = [
      { visible: true as const },
      { visible: false as const },
    ];

    expect(resolveLayerDrawMode(singleVisible, 0, { activeLayer: 0, isolate: false })).toBe('full');
  });

  it('does not subdue remaining layers when the active layer is hidden', () => {
    expect(resolveLayerDrawMode(layers, 0, { activeLayer: 2, isolate: false })).toBe('full');
    expect(resolveLayerDrawMode(layers, 1, { activeLayer: 2, isolate: false })).toBe('full');
    expect(resolveLayerDrawMode(layers, 2, { activeLayer: 2, isolate: false })).toBe('skip');
  });

  it('isolates the active layer even when it is hidden', () => {
    expect(resolveLayerDrawMode(layers, 2, { activeLayer: 2, isolate: true })).toBe('full');
    expect(resolveLayerDrawMode(layers, 0, { activeLayer: 2, isolate: true })).toBe('skip');
    expect(resolveLayerDrawMode(layers, 1, { activeLayer: 2, isolate: true })).toBe('skip');
  });

  it('follows the active layer when isolate stays on', () => {
    expect(resolveLayerDrawMode(layers, 0, { activeLayer: 0, isolate: true })).toBe('full');
    expect(resolveLayerDrawMode(layers, 1, { activeLayer: 0, isolate: true })).toBe('skip');
  });
});

describe('emptyCellsForActiveLayer', () => {
  const map: Map = {
    id: 'map-1',
    name: 'Test',
    width: 2,
    height: 2,
    tilesetId: 'ts-1',
    layers: [
      { name: 'Ground', data: [0, -1, -1, -1], visible: true },
      { name: 'Overlay', data: [-1, -1, -1, 3], visible: true },
      { name: 'Hidden overlay', data: [-1, -1, -1, -1], visible: false },
    ],
  };

  it('marks empty cells of the active layer even when another layer has a tile there', () => {
    expect(emptyCellsForActiveLayer(map, 1, false)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
  });

  it('hides markers when the active layer is hidden unless isolate is on', () => {
    expect(shouldShowEmptyCellMarkers(map.layers[2], false)).toBe(false);
    expect(emptyCellsForActiveLayer(map, 2, false)).toEqual([]);
    expect(emptyCellsForActiveLayer(map, 2, true)).toHaveLength(4);
  });

  it('returns no markers without a map', () => {
    expect(emptyCellsForActiveLayer(null, 0, false)).toEqual([]);
  });
});
