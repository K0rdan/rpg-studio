'use client';

import { Box, Divider } from '@mui/material';
import { useParams } from 'next/navigation';
import {
  Brush as BrushIcon,
  FormatColorFill as FillIcon,
  Backspace as EraserIcon,
  CropSquare as SelectIcon,
  Person as EntityIcon,
  FolderOpen as ProjectExplorerIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { ToolButton } from './ToolButton';
import { useEditorStore } from '@/stores/editorStore';
import { useMapEngine } from '@/hooks/useMapEngine';
import { useToast } from '@/context/ToastContext';
import { usePreview } from '@/context/PreviewContext';
import { useEntities } from '@/hooks/useEntities';
import { useEffect } from 'react';

export const ToolBar = () => {
  const params = useParams();
  const projectId = params?.projectId as string;
  
  const activeTool = useEditorStore((state) => state.tools.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const leftSidebarOpen = useEditorStore((state) => state.layout.leftSidebarOpen);
  const toggleLeftSidebar = useEditorStore((state) => state.toggleLeftSidebar);
  const isDirty = useEditorStore((state) => state.map.isDirty);
  const saveStatus = useEditorStore((state) => state.map.saveStatus);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const setMapDirty = useEditorStore((state) => state.setMapDirty);
  
  const { currentMap } = useMapEngine(projectId);
  const { showToast } = useToast();
  const preview = usePreview();
  const { entities } = useEntities(projectId, currentMap?.id || '');

  const handleSave = async () => {
    if (!currentMap || !isDirty) return;
    
    setSaveStatus('saving');
    
    try {
      const response = await fetch(`/api/projects/${projectId}/maps/${currentMap.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layers: currentMap.layers,
          width: currentMap.width,
          height: currentMap.height,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save map');
      }
      
      setSaveStatus('saved');
      setMapDirty(false);
      showToast('Map saved successfully', 'success');
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving map:', error);
      setSaveStatus('error');
      showToast('Failed to save map', 'error');
      
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleSettings = () => {
    // TODO: Implement settings
    console.log('Settings clicked');
  };

  const handlePreview = async () => {
    // Check if player entity exists
    const hasPlayer = entities?.some(e => e.type === 'player');
    if (!hasPlayer) {
      showToast('Add a player entity to preview the game', 'info');
      return;
    }

    try {
      // Fetch preview data from API
      const response = await fetch(`/api/projects/${projectId}/preview`);
      if (!response.ok) {
        throw new Error('Failed to fetch preview data');
      }
      
      const data = await response.json();
      
      // Open preview modal
      preview.play(data);
    } catch (error) {
      console.error('Error loading preview:', error);
      showToast('Failed to load preview', 'error');
    }
  };

  // Keyboard shortcuts (Cmd+S / Ctrl+S for save, Cmd+P / Ctrl+P for preview)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        handlePreview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMap, isDirty, projectId, entities]); // Dependencies for handleSave and handlePreview

  return (
    <Box
      id="toolbar"
      sx={{
        width: 56,
        height: '100vh',
        bgcolor: '#2d2d2d',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #444',
        flexShrink: 0,
      }}
    >
      {/* Top: Drawing Tools */}
      <Box id="toolbar-drawing-tools">
        <ToolButton
          icon={<BrushIcon />}
          tooltip="Brush (B)"
          active={activeTool === 'brush'}
          onClick={() => setActiveTool('brush')}
        />
        <ToolButton
          icon={<FillIcon />}
          tooltip="Fill (F)"
          active={activeTool === 'fill'}
          onClick={() => setActiveTool('fill')}
          disabled
        />
        <ToolButton
          icon={<EraserIcon />}
          tooltip="Eraser (E)"
          active={activeTool === 'eraser'}
          onClick={() => setActiveTool('eraser')}
          disabled
        />
        <ToolButton
          icon={<SelectIcon />}
          tooltip="Select (S)"
          active={activeTool === 'select'}
          onClick={() => setActiveTool('select')}
          disabled
        />
        <ToolButton
          icon={<EntityIcon />}
          tooltip="Entity (N)"
          active={activeTool === 'entity'}
          onClick={() => setActiveTool('entity')}
        />
      </Box>

      {/* Divider */}
      <Divider sx={{ borderColor: '#444', my: 1 }} />

      {/* Middle: View Toggles */}
      <Box id="toolbar-view-toggles" sx={{ flex: 1 }}>
        <ToolButton
          icon={<ProjectExplorerIcon />}
          tooltip="Project Explorer (Ctrl+B)"
          active={leftSidebarOpen}
          onClick={toggleLeftSidebar}
        />
      </Box>

      {/* Divider */}
      <Divider sx={{ borderColor: '#444', my: 1 }} />

      {/* Bottom: Actions */}
      <Box id="toolbar-actions">
        <ToolButton
          icon={<PlayArrowIcon />}
          tooltip={
            !entities || entities.length === 0 ? 'Add entities to preview' :
            !entities.some(e => e.type === 'player') ? 'Add a player entity to preview' :
            'Preview Game (Ctrl+P)'
          }
          onClick={handlePreview}
          disabled={!entities || !entities.some(e => e.type === 'player')}
        />
        <ToolButton
          icon={<SaveIcon />}
          tooltip={
            saveStatus === 'saving' ? 'Saving...' :
            saveStatus === 'saved' ? 'Saved!' :
            saveStatus === 'error' ? 'Save failed' :
            isDirty ? 'Save (Ctrl+S)' : 'No changes'
          }
          onClick={handleSave}
          disabled={!isDirty || saveStatus === 'saving'}
        />
        <ToolButton
          icon={<SettingsIcon />}
          tooltip="Settings"
          onClick={handleSettings}
        />
      </Box>
    </Box>
  );
};
