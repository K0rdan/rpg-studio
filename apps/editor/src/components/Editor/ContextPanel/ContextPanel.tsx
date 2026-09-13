'use client';

import { Box } from '@mui/material';
import { useSelectionStore } from '@/stores/selectionStore';
import { useEditorStore } from '@/stores/editorStore';
import { EmptyState } from './EmptyState';
import { CharsetPreview } from './CharsetPreview';
import { TilePalette } from '../TilePalette/TilePalette';
import { EntityPalette } from '../EntityPalette/EntityPalette';
import type { Sprite } from '@packages/types';

export const ContextPanel = () => {
  const selectedType = useSelectionStore((state) => state.type);
  const selectedId = useSelectionStore((state) => state.id);
  const selectedData = useSelectionStore((state) => state.data);
  const activeTool = useEditorStore((state) => state.tools.activeTool);

  // Render content based on selection type or active tool
  const renderContent = () => {
    // Explicit asset selections take precedence over the active editing tool.
    if (selectedType === 'tileset' && selectedId) {
      return <TilePalette tilesetId={selectedId} />;
    }

    if (selectedType === 'charset' && selectedId && selectedData) {
      return <CharsetPreview sprite={selectedData as Sprite} />;
    }

    // Show Entity Palette when entity tool is active (no entity selected)
    if (activeTool === 'entity') {
      return <EntityPalette />;
    }
    
    // Show Tile Palette when brush tool is active
    if (activeTool === 'brush') {
      return <TilePalette />;
    }
    
    // No selection - show empty state
    if (!selectedType || !selectedId) {
      return <EmptyState />;
    }
    
    switch (selectedType) {
      case 'map':
        // Map selected → show Tile Palette for painting.
        // Map properties (name, size, tileset) live in the right Inspector panel.
        return <TilePalette />;
      case 'entity':
      case 'tile':
      case 'sound':
      case 'tileset':
      case 'charset':
      case null:
        return <EmptyState />;
      default: {
        const exhaustive: never = selectedType;
        return exhaustive;
      }
    }
  };

  return (
    <Box
      id="context-panel"
      sx={{
        height: '100%',
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {renderContent()}
    </Box>
  );
};
