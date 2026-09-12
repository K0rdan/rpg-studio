import { create } from 'zustand';
import { setTileCollidable as updateTileCollidable } from '@/lib/tilesetTiles';
import type { Tileset } from '@packages/types';

export type ToolType = 'brush' | 'fill' | 'eraser' | 'select' | 'entity' | 'region';

interface EditorLayoutState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarWidth: number;
  contextPanelWidth: number;
  rightSidebarWidth: number;
  tilePaletteHeight: number;
}

// Tool state
interface ToolState {
  activeTool: ToolType;
  brushSize: number;
  opacity: number;
  selectedTileId: number | null;
}

// Painting state
interface PaintingState {
  isPainting: boolean;
  lastPaintedTile: { x: number; y: number } | null;
}

interface MapState {
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  activeLayer: number;
  isolateLayers: boolean;
  collisionOverlayVisible: boolean;
}

interface TilesetState {
  current: Tileset | null;
  isDirty: boolean;
}

interface EditorState {
  // Layout
  layout: EditorLayoutState;
  
  // Tools
  tools: ToolState;
  
  // Painting
  painting: PaintingState;
  
  // Map
  map: MapState;

  // Tileset
  tileset: TilesetState;
  
  // Actions
  toggleLeftSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  toggleRightSidebar: () => void;
  setLeftSidebarWidth: (width: number) => void;
  setContextPanelWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setTilePaletteHeight: (height: number) => void;
  
  setActiveTool: (tool: ToolType) => void;
  setBrushSize: (size: number) => void;
  setOpacity: (opacity: number) => void;
  setSelectedTileId: (tileId: number | null) => void;
  
  setIsPainting: (isPainting: boolean) => void;
  setLastPaintedTile: (tile: { x: number; y: number } | null) => void;
  
  setMapDirty: (isDirty: boolean) => void;
  setSaveStatus: (status: MapState['saveStatus']) => void;
  setActiveLayer: (layer: number) => void;
  setIsolateLayers: (isolate: boolean) => void;
  toggleCollisionOverlay: () => void;

  setCurrentTileset: (tileset: Tileset | null) => void;
  setTileCollidable: (tileId: number, isCollidable: boolean) => void;
  setTilesetDirty: (isDirty: boolean) => void;
}

const DEFAULT_LAYOUT: EditorLayoutState = {
  leftSidebarOpen: false,  // Opened on editor load when viewport is wide enough
  rightSidebarOpen: true,
  leftSidebarWidth: 250,
  contextPanelWidth: 350,
  rightSidebarWidth: 300,
  tilePaletteHeight: 200,
};

const DEFAULT_TOOLS: ToolState = {
  activeTool: 'brush',
  brushSize: 1,
  opacity: 100,
  selectedTileId: null,
};

const DEFAULT_PAINTING: PaintingState = {
  isPainting: false,
  lastPaintedTile: null,
};

const DEFAULT_MAP: MapState = {
  isDirty: false,
  saveStatus: 'idle',
  activeLayer: 0,
  isolateLayers: false,
  collisionOverlayVisible: false,
};

const DEFAULT_TILESET: TilesetState = {
  current: null,
  isDirty: false,
};

export const useEditorStore = create<EditorState>((set) => ({
  layout: DEFAULT_LAYOUT,
  tools: DEFAULT_TOOLS,
  painting: DEFAULT_PAINTING,
  map: DEFAULT_MAP,
  tileset: DEFAULT_TILESET,
  
  toggleLeftSidebar: () =>
    set((state) => ({
      layout: { ...state.layout, leftSidebarOpen: !state.layout.leftSidebarOpen },
    })),

  setLeftSidebarOpen: (open: boolean) =>
    set((state) => ({
      layout: { ...state.layout, leftSidebarOpen: open },
    })),
  
  toggleRightSidebar: () =>
    set((state) => ({
      layout: { ...state.layout, rightSidebarOpen: !state.layout.rightSidebarOpen },
    })),
  
  setLeftSidebarWidth: (width: number) =>
    set((state) => ({
      layout: { ...state.layout, leftSidebarWidth: Math.max(200, Math.min(400, width)) },
    })),
  
  setContextPanelWidth: (width: number) =>
    set((state) => ({
      layout: { ...state.layout, contextPanelWidth: Math.max(300, Math.min(500, width)) },
    })),
  
  setRightSidebarWidth: (width: number) =>
    set((state) => ({
      layout: { ...state.layout, rightSidebarWidth: Math.max(250, Math.min(500, width)) },
    })),
  
  setTilePaletteHeight: (height: number) =>
    set((state) => ({
      layout: { ...state.layout, tilePaletteHeight: Math.max(150, Math.min(300, height)) },
    })),
  
  setActiveTool: (tool: ToolType) =>
    set((state) => ({
      tools: { ...state.tools, activeTool: tool },
    })),
  
  setBrushSize: (size: number) =>
    set((state) => ({
      tools: { ...state.tools, brushSize: Math.max(1, Math.min(10, size)) },
    })),
  
  setOpacity: (opacity: number) =>
    set((state) => ({
      tools: { ...state.tools, opacity: Math.max(0, Math.min(100, opacity)) },
    })),
  
  setSelectedTileId: (tileId: number | null) =>
    set((state) => ({
      tools: { ...state.tools, selectedTileId: tileId },
    })),
  
  setIsPainting: (isPainting: boolean) =>
    set((state) => ({
      painting: { ...state.painting, isPainting },
    })),
  
  setLastPaintedTile: (tile: { x: number; y: number } | null) =>
    set((state) => ({
      painting: { ...state.painting, lastPaintedTile: tile },
    })),
  
  setMapDirty: (isDirty: boolean) =>
    set((state) => ({
      map: { ...state.map, isDirty },
    })),
  
  setSaveStatus: (status: MapState['saveStatus']) =>
    set((state) => ({
      map: { ...state.map, saveStatus: status },
    })),
  
  setActiveLayer: (layer: number) =>
    set((state) => ({
      map: { ...state.map, activeLayer: layer },
    })),

  setIsolateLayers: (isolate: boolean) =>
    set((state) => ({
      map: { ...state.map, isolateLayers: isolate },
    })),

  toggleCollisionOverlay: () =>
    set((state) => ({
      map: {
        ...state.map,
        collisionOverlayVisible: !state.map.collisionOverlayVisible,
      },
    })),

  setCurrentTileset: (tileset: Tileset | null) =>
    set({
      tileset: {
        current: tileset
          ? { ...tileset, tiles: tileset.tiles ? [...tileset.tiles] : [] }
          : null,
        isDirty: false,
      },
    }),

  setTileCollidable: (tileId: number, isCollidable: boolean) =>
    set((state) => {
      const current = state.tileset.current;
      if (!current) return state;

      return {
        tileset: {
          current: {
            ...current,
            tiles: updateTileCollidable(current.tiles, tileId, isCollidable),
          },
          isDirty: true,
        },
      };
    }),

  setTilesetDirty: (isDirty: boolean) =>
    set((state) => ({
      tileset: { ...state.tileset, isDirty },
    })),
}));
