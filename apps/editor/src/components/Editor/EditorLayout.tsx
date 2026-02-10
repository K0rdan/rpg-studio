'use client';

import { Box } from '@mui/material';
import { TopBar } from './TopBar/TopBar';
import { ProjectExplorer } from './ProjectExplorer/ProjectExplorer';
import { MapCanvas } from './Canvas/MapCanvas';
import { TilePalette } from './TilePalette/TilePalette';
import { Inspector } from './Inspector/Inspector';
import { ResizablePanel } from '../shared/ResizablePanel';
import { useEditorStore } from '@/stores/editorStore';
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export const EditorLayout = () => {
  // Load and persist layout preferences
  useLayoutPersistence();
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  const leftSidebarOpen = useEditorStore((state) => state.layout.leftSidebarOpen);
  const rightSidebarOpen = useEditorStore((state) => state.layout.rightSidebarOpen);
  const leftSidebarWidth = useEditorStore((state) => state.layout.leftSidebarWidth);
  const rightSidebarWidth = useEditorStore((state) => state.layout.rightSidebarWidth);
  const setLeftSidebarWidth = useEditorStore((state) => state.setLeftSidebarWidth);
  const setRightSidebarWidth = useEditorStore((state) => state.setRightSidebarWidth);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar />
      
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel: Project Explorer */}
        {leftSidebarOpen && (
          <ResizablePanel
            id="project-explorer"
            defaultWidth={leftSidebarWidth}
            minWidth={200}
            maxWidth={400}
            position="left"
            onWidthChange={setLeftSidebarWidth}
          >
            <ProjectExplorer />
          </ResizablePanel>
        )}
        
        {/* Center: Canvas + Tile Palette */}
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <MapCanvas />
          <TilePalette />
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
