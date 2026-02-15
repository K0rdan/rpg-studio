import { create } from 'zustand';

interface TileSelectionState {
  selectedTilesetId: string | null;
  selectedTileIndex: number | null;  // Index in tileset grid
  selectedTileCoords: { x: number; y: number } | null;
  
  setSelectedTileset: (tilesetId: string) => void;
  setSelectedTile: (index: number, coords: { x: number; y: number }) => void;
  clearSelection: () => void;
}

export const useTileSelectionStore = create<TileSelectionState>((set) => ({
  selectedTilesetId: null,
  selectedTileIndex: null,
  selectedTileCoords: null,
  
  setSelectedTileset: (tilesetId) => {
    set({ 
      selectedTilesetId: tilesetId,
      // Clear tile selection when changing tileset
      selectedTileIndex: null,
      selectedTileCoords: null
    });
  },
  
  setSelectedTile: (index, coords) => {
    set({ 
      selectedTileIndex: index,
      selectedTileCoords: coords
    });
  },
  
  clearSelection: () => {
    set({ 
      selectedTilesetId: null,
      selectedTileIndex: null,
      selectedTileCoords: null
    });
  },
}));
