import { resolveLayerDrawMode as resolveEngineLayerDrawMode } from '@packages/core';
import type { Layer, Map } from '@packages/types';

export const DEFAULT_INACTIVE_OPACITY = 0.28;
export const EMPTY_TILE = -1;

export type LayerDrawMode = 'skip' | 'full' | 'subdued';

export interface LayerFocusState {
  activeLayer: number;
  isolate: boolean;
}

export function isLayerVisible(layer: Pick<Layer, 'visible'> | undefined): boolean {
  return layer?.visible !== false;
}

export function resolveLayerDrawMode(
  layers: Array<Pick<Layer, 'visible'>>,
  layerIndex: number,
  focus: LayerFocusState,
): LayerDrawMode {
  return resolveEngineLayerDrawMode(layers, layerIndex, {
    focusLayerIndex: focus.activeLayer,
    isolate: focus.isolate,
    inactiveOpacity: DEFAULT_INACTIVE_OPACITY,
  });
}

export function shouldShowEmptyCellMarkers(
  layer: Pick<Layer, 'visible'> | undefined,
  isolate: boolean,
): boolean {
  if (!layer) return false;
  return isolate || isLayerVisible(layer);
}

export function emptyCellsForActiveLayer(
  map: Map | null,
  activeLayer: number,
  isolate: boolean,
): Array<{ x: number; y: number }> {
  if (!map) return [];

  const layer = map.layers[activeLayer];
  if (!shouldShowEmptyCellMarkers(layer, isolate)) return [];

  const cells: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < layer.data.length; index += 1) {
    if (layer.data[index] !== EMPTY_TILE) continue;
    cells.push({
      x: index % map.width,
      y: Math.floor(index / map.width),
    });
  }
  return cells;
}
