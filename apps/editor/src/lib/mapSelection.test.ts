import type { Map } from '@packages/types';
import { useMapStore } from '@/stores/mapStore';
import { useProjectExplorerStore } from '@/stores/projectExplorerStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { clearMapSelection, resolveInitialMap, selectMap } from './mapSelection';

const makeMap = (id: string): Map => ({
  id,
  name: `Map ${id}`,
  width: 20,
  height: 15,
  tilesetId: `tileset-${id}`,
  layers: [],
});

describe('resolveInitialMap', () => {
  it('returns the first map when nothing is selected yet', () => {
    const maps = [makeMap('a'), makeMap('b')];
    expect(resolveInitialMap(maps, null)?.id).toBe('a');
  });

  it('keeps the already selected map when it still exists', () => {
    const maps = [makeMap('a'), makeMap('b')];
    expect(resolveInitialMap(maps, 'b')?.id).toBe('b');
  });

  it('falls back to the first map when the selected one is gone', () => {
    const maps = [makeMap('a'), makeMap('b')];
    expect(resolveInitialMap(maps, 'deleted')?.id).toBe('a');
  });

  it('returns null for a project without maps', () => {
    expect(resolveInitialMap([], null)).toBeNull();
  });
});

describe('selectMap', () => {
  beforeEach(() => {
    clearMapSelection();
  });

  it('syncs the explorer, the inspector and the canvas on the same map', () => {
    const map = makeMap('a');

    selectMap(map);

    expect(useProjectExplorerStore.getState().selectedItemId).toBe('a');
    expect(useProjectExplorerStore.getState().selectedItemType).toBe('map');
    expect(useSelectionStore.getState().type).toBe('map');
    expect(useSelectionStore.getState().id).toBe('a');
    expect(useSelectionStore.getState().data).toEqual(map);
    expect(useMapStore.getState().activeMapId).toBe('a');
  });

  it('clears every store when the selection is dropped', () => {
    selectMap(makeMap('a'));

    clearMapSelection();

    expect(useProjectExplorerStore.getState().selectedItemId).toBeNull();
    expect(useSelectionStore.getState().type).toBeNull();
    expect(useMapStore.getState().activeMapId).toBeNull();
  });
});
