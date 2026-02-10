import { create } from 'zustand';

interface MapState {
  activeMapId: string | null;
  cursorPosition: { x: number; y: number };
  zoom: number;
  gridVisible: boolean;
  
  setActiveMapId: (mapId: string | null) => void;
  setCursorPosition: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  activeMapId: null,
  cursorPosition: { x: 0, y: 0 },
  zoom: 100,
  gridVisible: true,
  
  setActiveMapId: (mapId) =>
    set({ activeMapId: mapId }),
  
  setCursorPosition: (x, y) =>
    set({ cursorPosition: { x, y } }),
  
  setZoom: (zoom) =>
    set({ zoom: Math.max(10, Math.min(400, zoom)) }),
  
  toggleGrid: () =>
    set((state) => ({ gridVisible: !state.gridVisible })),
}));
