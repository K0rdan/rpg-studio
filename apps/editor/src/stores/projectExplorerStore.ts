import { create } from 'zustand';

interface ProjectExplorerState {
  expandedFolders: Set<string>;
  selectedItemId: string | null;
  selectedItemType: 'map' | 'entity' | 'tileset' | 'charset' | 'sound' | null;
  
  toggleFolder: (folderId: string) => void;
  setSelectedItem: (id: string | null, type: 'map' | 'entity' | 'tileset' | 'charset' | 'sound' | null) => void;
}

export const useProjectExplorerStore = create<ProjectExplorerState>((set) => ({
  expandedFolders: new Set(['maps', 'entities', 'assets']),
  selectedItemId: null,
  selectedItemType: null,
  
  toggleFolder: (folderId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedFolders);
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId);
      } else {
        newExpanded.add(folderId);
      }
      return { expandedFolders: newExpanded };
    }),
  
  setSelectedItem: (id, type) =>
    set({ selectedItemId: id, selectedItemType: type }),
}));
