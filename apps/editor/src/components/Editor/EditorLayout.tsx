'use client';

import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { ToolBar } from './ToolBar/ToolBar';
import { ProjectExplorer } from './ProjectExplorer/ProjectExplorer';
import { ContextPanel } from './ContextPanel/ContextPanel';
import { MapCanvas } from './Canvas/MapCanvas';
import { Inspector } from './Inspector/Inspector';
import { ResizablePanel } from '../shared/ResizablePanel';
import { useEditorStore } from '@/stores/editorStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const TOOLBAR_WIDTH = 56; // Width of vertical toolbar

export const EditorLayout = () => {
  // Load and persist layout preferences
  useLayoutPersistence();
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  const leftSidebarOpen = useEditorStore((state) => state.layout.leftSidebarOpen);
  const rightSidebarOpen = useEditorStore((state) => state.layout.rightSidebarOpen);
  const leftSidebarWidth = useEditorStore((state) => state.layout.leftSidebarWidth);
  const contextPanelWidth = useEditorStore((state) => state.layout.contextPanelWidth);
  const rightSidebarWidth = useEditorStore((state) => state.layout.rightSidebarWidth);
  const setLeftSidebarWidth = useEditorStore((state) => state.setLeftSidebarWidth);
  const setContextPanelWidth = useEditorStore((state) => state.setContextPanelWidth);
  const setRightSidebarWidth = useEditorStore((state) => state.setRightSidebarWidth);

  // Check if something is selected for context panel OR if entity/brush tool is active
  const selectedType = useSelectionStore((state) => state.type);
  const selectedId = useSelectionStore((state) => state.id);
  const activeTool = useEditorStore((state) => state.tools.activeTool);
  const hasSelection = (selectedType && selectedId) || activeTool === 'entity' || activeTool === 'brush';

  // Calculate max width for left panel group: 40% of viewport - toolbar width
  // Use state to avoid hydration mismatch
  const [maxLeftPanelGroupWidth, setMaxLeftPanelGroupWidth] = useState(600);
  
  useEffect(() => {
    const updateMaxWidth = () => {
      setMaxLeftPanelGroupWidth(Math.floor(window.innerWidth * 0.4) - TOOLBAR_WIDTH);
    };
    
    updateMaxWidth();
    window.addEventListener('resize', updateMaxWidth);
    return () => window.removeEventListener('resize', updateMaxWidth);
  }, []);

  // Calculate max width for context panel: remaining space after project tree
  const maxContextPanelWidth = Math.max(300, maxLeftPanelGroupWidth - leftSidebarWidth);

  return (
    <Box id="editor-layout" sx={{ display: 'flex', height: '100%' }}>
      {/* Left: Vertical Toolbar */}
      <ToolBar />
      
      {/* Main Content Area */}
      <Box id="editor-main-content" sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panels: Project Tree + Context Panel (max 40% viewport - toolbar) */}
        {(leftSidebarOpen || hasSelection) && (
          <Box
            id="left-panel-group"
            sx={{ 
              display: 'flex',
              maxWidth: `${maxLeftPanelGroupWidth}px`,
              flexShrink: 0,
            }}
          >
            {/* Project Tree */}
            {leftSidebarOpen && (
              <ResizablePanel
                id="project-tree"
                defaultWidth={leftSidebarWidth}
                minWidth={200}
                maxWidth={Math.min(400, maxLeftPanelGroupWidth - (hasSelection ? 300 : 0))}
                position="left"
                onWidthChange={setLeftSidebarWidth}
              >
                <ProjectExplorer />
              </ResizablePanel>
            )}
            
            {/* Context Panel - Show when something is selected OR entity tool is active */}
            {hasSelection && (
              <ResizablePanel
                id="context-panel"
                defaultWidth={contextPanelWidth}
                minWidth={300}
                maxWidth={maxContextPanelWidth}
                position="left"
                onWidthChange={setContextPanelWidth}
              >
                <ContextPanel />
              </ResizablePanel>
            )}
          </Box>
        )}
        
        {/* Center: Canvas (flex - takes remaining space) */}
        <Box id="canvas-container" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MapCanvas />
        </Box>
        
        {/* Right Panel: Inspector */}
        {rightSidebarOpen && (
          <ResizablePanel
            id="inspector"
            defaultWidth={rightSidebarWidth}
            minWidth={250}
            maxWidth={500}
            position="right"
            onWidthChange={setRightSidebarWidth}
          >
            <Inspector />
          </ResizablePanel>
        )}
      </Box>
    </Box>
  );
};

