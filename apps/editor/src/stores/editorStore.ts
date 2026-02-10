import { create } from 'zustand';

export type ToolType = 'brush' | 'fill' | 'eraser' | 'select' | 'entity' | 'region';

interface EditorLayoutState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  tilePaletteHeight: number;
}

interface ToolState {
  activeTool: ToolType;
  brushSize: number;
  opacity: number;
  selectedTileId: number | null;
}

interface EditorState {
  // Layout
  layout: EditorLayoutState;
  
  // Tools
  tools: ToolState;
  
  // Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setTilePaletteHeight: (height: number) => void;
  
  setActiveTool: (tool: ToolType) => void;
  setBrushSize: (size: number) => void;
  setOpacity: (opacity: number) => void;
  setSelectedTileId: (tileId: number | null) => void;
}

const DEFAULT_LAYOUT: EditorLayoutState = {
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  leftSidebarWidth: 250,
  rightSidebarWidth: 300,
  tilePaletteHeight: 200,
};

const DEFAULT_TOOLS: ToolState = {
  activeTool: 'brush',
  brushSize: 1,
  opacity: 100,
  selectedTileId: null,
};

export const useEditorStore = create<EditorState>((set) => ({
  layout: DEFAULT_LAYOUT,
  tools: DEFAULT_TOOLS,
  
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
}));
