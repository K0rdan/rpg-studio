import type { Map } from '@packages/types';
import { useMapStore } from '@/stores/mapStore';
import { useProjectExplorerStore } from '@/stores/projectExplorerStore';
import { useSelectionStore } from '@/stores/selectionStore';

/**
 * Map the editor should open with: keep the current selection while it still
 * exists in the project, otherwise fall back to the first map of the list.
 */
export const resolveInitialMap = (maps: Map[], selectedMapId: string | null): Map | null => {
  if (maps.length === 0) return null;
  return maps.find((map) => map.id === selectedMapId) ?? maps[0];
};

/** Selects a map for the explorer tree, the inspector and the canvas at once. */
export const selectMap = (map: Map) => {
  useProjectExplorerStore.getState().setSelectedItem(map.id, 'map');
  useSelectionStore.getState().setSelection('map', map.id, map);
  useMapStore.getState().setActiveMapId(map.id);
};

/** Clears the map selection everywhere, e.g. after deleting the active map. */
export const clearMapSelection = () => {
  useProjectExplorerStore.getState().setSelectedItem(null, null);
  useSelectionStore.getState().setSelection(null, null, null);
  useMapStore.getState().setActiveMapId(null);
  useMapStore.getState().setCurrentMap(null);
};
