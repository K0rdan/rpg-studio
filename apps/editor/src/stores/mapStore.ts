import { create } from 'zustand';
import type { LayerRenderPriority, Map } from '@packages/types';
import { paintTileOnMap, type PaintTileInput } from '@/lib/mapPainting';
import {
  addMapLayer,
  moveMapLayer,
  removeMapLayer,
  renameMapLayer,
  resizeMapLayers,
  setMapLayerPriority,
  toggleMapLayerVisibility,
  type LayerDirection,
} from '@/lib/mapLayers';
import { useEditorStore } from '@/stores/editorStore';

interface MapState {
  activeMapId: string | null;
  /**
   * Map currently open in the editor, including unsaved edits. Shared state so
   * the canvas, the inspector and the save/preview actions all read the same
   * tiles instead of each keeping their own copy.
   */
  currentMap: Map | null;
  cursorPosition: { x: number; y: number };
  zoom: number;
  gridVisible: boolean;
  
  setActiveMapId: (mapId: string | null) => void;
  setCurrentMap: (map: Map | null) => void;
  paintTile: (input: PaintTileInput) => void;
  addLayer: () => number | null;
  renameLayer: (index: number, name: string) => void;
  removeLayer: (index: number, activeLayer: number) => number;
  moveLayer: (index: number, direction: LayerDirection, activeLayer: number) => number;
  toggleLayerVisibility: (index: number) => void;
  setLayerPriority: (index: number, priority: LayerRenderPriority) => void;
  resizeLayers: (width: number, height: number) => void;
  setCursorPosition: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  activeMapId: null,
  currentMap: null,
  cursorPosition: { x: 0, y: 0 },
  zoom: 100,
  gridVisible: true,
  
  setActiveMapId: (mapId) =>
    set({ activeMapId: mapId }),

  setCurrentMap: (map) =>
    set({ currentMap: map }),

  paintTile: (input) =>
    set((state) =>
      state.currentMap ? { currentMap: paintTileOnMap(state.currentMap, input) } : state,
    ),

  addLayer: () => {
    const currentMap = get().currentMap;
    if (!currentMap) return null;

    const result = addMapLayer(currentMap);
    set({ currentMap: result.map });
    useEditorStore.getState().setMapDirty(true);
    return result.activeLayer;
  },

  renameLayer: (index, name) => {
    const currentMap = get().currentMap;
    if (!currentMap) return;

    const nextMap = renameMapLayer(currentMap, index, name);
    if (nextMap === currentMap) return;

    set({ currentMap: nextMap });
    useEditorStore.getState().setMapDirty(true);
  },

  removeLayer: (index, activeLayer) => {
    const currentMap = get().currentMap;
    if (!currentMap) return 0;

    const result = removeMapLayer(currentMap, index, activeLayer);
    if (result.map !== currentMap) {
      set({ currentMap: result.map });
      useEditorStore.getState().setMapDirty(true);
    }
    return result.activeLayer;
  },

  moveLayer: (index, direction, activeLayer) => {
    const currentMap = get().currentMap;
    if (!currentMap) return 0;

    const result = moveMapLayer(currentMap, index, direction, activeLayer);
    if (result.map !== currentMap) {
      set({ currentMap: result.map });
      useEditorStore.getState().setMapDirty(true);
    }
    return result.activeLayer;
  },

  toggleLayerVisibility: (index) => {
    const currentMap = get().currentMap;
    if (!currentMap) return;

    const nextMap = toggleMapLayerVisibility(currentMap, index);
    if (nextMap === currentMap) return;

    set({ currentMap: nextMap });
    useEditorStore.getState().setMapDirty(true);
  },

  setLayerPriority: (index, priority) => {
    const currentMap = get().currentMap;
    if (!currentMap) return;

    const nextMap = setMapLayerPriority(currentMap, index, priority);
    if (nextMap === currentMap) return;

    set({ currentMap: nextMap });
    useEditorStore.getState().setMapDirty(true);
  },

  resizeLayers: (width, height) => {
    const currentMap = get().currentMap;
    if (!currentMap) return;

    const nextMap = resizeMapLayers(currentMap, width, height);
    if (nextMap === currentMap) return;

    set({ currentMap: nextMap });
    useEditorStore.getState().setMapDirty(true);
  },
  
  setCursorPosition: (x, y) =>
    set({ cursorPosition: { x, y } }),
  
  setZoom: (zoom) =>
    set({ zoom: Math.max(10, Math.min(400, zoom)) }),
  
  toggleGrid: () =>
    set((state) => ({ gridVisible: !state.gridVisible })),
}));
