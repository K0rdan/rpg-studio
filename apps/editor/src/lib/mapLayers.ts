import type { Layer, LayerRenderPriority, Map } from '@packages/types';

export type LayerDirection = 'up' | 'down';

export interface LayerMutationResult {
  map: Map;
  activeLayer: number;
}

const EMPTY_TILE = -1;

export function clampActiveLayer(map: Map, activeLayer: number): number {
  return Math.max(0, Math.min(activeLayer, Math.max(0, map.layers.length - 1)));
}

export function normalizeMapLayers(map: Map): Map {
  const size = map.width * map.height;
  const layers = map.layers?.length
    ? map.layers.map((layer) => ({
        ...layer,
        data: normalizeLayerData(layer.data, size),
      }))
    : [createLayer('Layer 1', size)];

  const unchanged =
    layers.length === map.layers?.length &&
    layers.every((layer, index) => layer.data === map.layers[index].data);

  return unchanged ? map : { ...map, layers };
}

export function addMapLayer(map: Map): LayerMutationResult {
  const layer = createLayer(nextLayerName(map.layers), map.width * map.height);
  const layers = [...map.layers, layer];

  return {
    map: { ...map, layers },
    activeLayer: layers.length - 1,
  };
}

export function renameMapLayer(map: Map, index: number, name: string): Map {
  const nextName = name.trim();
  const layer = map.layers[index];
  if (!layer || !nextName || layer.name === nextName) return map;

  const layers = map.layers.map((item, layerIndex) =>
    layerIndex === index ? { ...item, name: nextName } : item,
  );
  return { ...map, layers };
}

export function removeMapLayer(
  map: Map,
  index: number,
  activeLayer: number,
): LayerMutationResult {
  if (map.layers.length <= 1 || !map.layers[index]) {
    return { map, activeLayer: clampActiveLayer(map, activeLayer) };
  }

  const layers = map.layers.filter((_, layerIndex) => layerIndex !== index);
  let nextActiveLayer = activeLayer;

  if (activeLayer === index) {
    nextActiveLayer = Math.min(index, layers.length - 1);
  } else if (activeLayer > index) {
    nextActiveLayer = activeLayer - 1;
  }

  const nextMap = { ...map, layers };
  return {
    map: nextMap,
    activeLayer: clampActiveLayer(nextMap, nextActiveLayer),
  };
}

export function moveMapLayer(
  map: Map,
  index: number,
  direction: LayerDirection,
  activeLayer: number,
): LayerMutationResult {
  const targetIndex = direction === 'up' ? index + 1 : index - 1;
  if (!map.layers[index] || targetIndex < 0 || targetIndex >= map.layers.length) {
    return { map, activeLayer: clampActiveLayer(map, activeLayer) };
  }

  const layers = [...map.layers];
  [layers[index], layers[targetIndex]] = [layers[targetIndex], layers[index]];

  let nextActiveLayer = activeLayer;
  if (activeLayer === index) {
    nextActiveLayer = targetIndex;
  } else if (activeLayer === targetIndex) {
    nextActiveLayer = index;
  }

  return {
    map: { ...map, layers },
    activeLayer: nextActiveLayer,
  };
}

export function toggleMapLayerVisibility(map: Map, index: number): Map {
  const layer = map.layers[index];
  if (!layer) return map;

  const layers = map.layers.map((item, layerIndex) =>
    layerIndex === index ? { ...item, visible: item.visible === false } : item,
  );
  return { ...map, layers };
}

export function setMapLayerPriority(
  map: Map,
  index: number,
  priority: LayerRenderPriority,
): Map {
  const layer = map.layers[index];
  if (!layer || (layer.priority ?? 'below') === priority) return map;

  const layers = map.layers.map((item, layerIndex) =>
    layerIndex === index ? { ...item, priority } : item,
  );
  return { ...map, layers };
}

export function resizeMapLayers(map: Map, width: number, height: number): Map {
  if (map.width === width && map.height === height) return map;

  const layers = map.layers.map((layer) => {
    const data = new Array<number>(width * height).fill(EMPTY_TILE);
    const copyWidth = Math.min(map.width, width);
    const copyHeight = Math.min(map.height, height);

    for (let y = 0; y < copyHeight; y += 1) {
      for (let x = 0; x < copyWidth; x += 1) {
        data[y * width + x] = layer.data[y * map.width + x] ?? EMPTY_TILE;
      }
    }

    return { ...layer, data };
  });

  return { ...map, width, height, layers };
}

export function hasPaintedTiles(layer: Layer): boolean {
  return layer.data.some((tile) => tile !== EMPTY_TILE);
}

function createLayer(name: string, size: number): Layer {
  return {
    name,
    data: new Array<number>(size).fill(EMPTY_TILE),
    visible: true,
    priority: 'below',
  };
}

function nextLayerName(layers: Layer[]): string {
  const names = new Set(layers.map((layer) => layer.name));
  let number = layers.length + 1;

  while (names.has(`Layer ${number}`)) number += 1;
  return `Layer ${number}`;
}

function normalizeLayerData(data: number[], size: number): number[] {
  if (data.length === size) return data;

  const normalized = new Array<number>(size).fill(EMPTY_TILE);
  for (let index = 0; index < Math.min(data.length, size); index += 1) {
    normalized[index] = data[index];
  }
  return normalized;
}
