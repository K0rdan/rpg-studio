'use client';

import { Box } from '@mui/material';
import { useSelectionStore } from '@/stores/selectionStore';
import { EmptyState } from './EmptyState';
import { MapProperties } from './MapProperties';
import { TilePalette } from '../TilePalette/TilePalette';

export const ContextPanel = () => {
  const selectedType = useSelectionStore((state) => state.type);
  const selectedId = useSelectionStore((state) => state.id);

  // No selection - show empty state
  if (!selectedType || !selectedId) {
    return (
      <Box
        sx={{
          height: '100%',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <EmptyState />
      </Box>
    );
  }

  // Render content based on selection type
  const renderContent = () => {
    switch (selectedType) {
      case 'tileset':
        return <TilePalette tilesetId={selectedId} />;
      case 'map':
        return <MapProperties mapId={selectedId} />;
      case 'entity':
        // TODO: Implement EntityProperties component
        return <EmptyState />;
      default:
        return <EmptyState />;
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
