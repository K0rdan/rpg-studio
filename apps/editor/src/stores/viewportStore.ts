import { create } from 'zustand';

// Supported zoom levels
export const ZOOM_LEVELS = [0.25, 0.5, 1, 2, 4, 8] as const;
export type ZoomLevel = typeof ZOOM_LEVELS[number];

const MIN_ZOOM = ZOOM_LEVELS[0];
const MAX_ZOOM = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];

interface ViewportState {
  zoom: ZoomLevel;
  offsetX: number;
  offsetY: number;
  
  // Zoom actions
  setZoom: (zoom: ZoomLevel) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  
  // Pan actions
  setOffset: (x: number, y: number) => void;
  pan: (dx: number, dy: number) => void;
  resetViewport: () => void;
}

export const useViewportStore = create<ViewportState>((set, get) => ({
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  
  setZoom: (zoom) => {
    // Clamp to min/max
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    set({ zoom: clampedZoom as ZoomLevel });
  },
  
  zoomIn: () => {
    const currentZoom = get().zoom;
    const currentIndex = ZOOM_LEVELS.indexOf(currentZoom);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      set({ zoom: ZOOM_LEVELS[currentIndex + 1] });
    }
  },
  
  zoomOut: () => {
    const currentZoom = get().zoom;
    const currentIndex = ZOOM_LEVELS.indexOf(currentZoom);
    if (currentIndex > 0) {
      set({ zoom: ZOOM_LEVELS[currentIndex - 1] });
    }
  },
  
  resetZoom: () => {
    set({ zoom: 1 });
  },
  
  setOffset: (x, y) => {
    set({ offsetX: x, offsetY: y });
  },
  
  pan: (dx, dy) => {
    const { offsetX, offsetY } = get();
    set({ offsetX: offsetX + dx, offsetY: offsetY + dy });
  },
  
  resetViewport: () => {
    set({ zoom: 1, offsetX: 0, offsetY: 0 });
  },
}));
