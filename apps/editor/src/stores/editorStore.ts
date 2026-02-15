import { create } from 'zustand';

export type ToolType = 'brush' | 'fill' | 'eraser' | 'select' | 'entity' | 'region';

interface EditorLayoutState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarWidth: number;
  contextPanelWidth: number;
  rightSidebarWidth: number;
  tilePaletteHeight: number;
}

interface ToolState {
  activeTool: ToolType;
  brushSize: number;
  opacity: number;
  selectedTileId: number | null;
}

interface PaintingState {
  isPainting: boolean;
  lastPaintedTile: { x: number; y: number } | null;
}

interface MapState {
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  activeLayer: number;
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
  
  // Actions
  toggleLeftSidebar: () => void;
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
}

const DEFAULT_LAYOUT: EditorLayoutState = {
  leftSidebarOpen: false,  // Hidden by default (VS Code style)
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
};

export const useEditorStore = create<EditorState>((set) => ({
  layout: DEFAULT_LAYOUT,
  tools: DEFAULT_TOOLS,
  painting: DEFAULT_PAINTING,
  map: DEFAULT_MAP,
  
  toggleLeftSidebar: () =>
    set((state) => ({
      layout: { ...state.layout, leftSidebarOpen: !state.layout.leftSidebarOpen },
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
}));
