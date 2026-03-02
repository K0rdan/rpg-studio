'use client';

import { useState } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import { useSelectionStore } from '@/stores/selectionStore';
import { useEditorStore } from '@/stores/editorStore';
import { useEntitySelectionStore } from '@/stores/entitySelectionStore';
import { useMapStore } from '@/stores/mapStore';
import { useEntities } from '@/hooks/useEntities';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from './EmptyState';
import { MapProperties } from './MapProperties';
import { TilePalette } from '../TilePalette/TilePalette';
import { EntityPalette } from '../EntityPalette/EntityPalette';
import { EntityProperties } from '../EntityProperties';
import type { Entity } from '@packages/types';

export const ContextPanel = () => {
  const params = useParams();
  const projectId = params?.projectId as string;
  
  const selectedType = useSelectionStore((state) => state.type);
  const selectedId = useSelectionStore((state) => state.id);
  const activeTool = useEditorStore((state) => state.tools.activeTool);
  const selectedEntityId = useEntitySelectionStore((state) => state.selectedEntityId);
  
  // Get active map ID from map store
  const activeMapId = useMapStore((state) => state.activeMapId);

  // Get entities from API
  const { entities, updateEntity, deleteEntity } = useEntities(projectId, activeMapId);
  const { showToast } = useToast();

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<Entity | null>(null);
  
  // Find the selected entity
  const selectedEntity = selectedEntityId
    ? entities.find((e) => e.id === selectedEntityId) || null
    : null;

  const handleUpdateEntity = async (entity: typeof selectedEntity) => {
    if (!entity) return;
    
    try {
      await updateEntity(entity.id, entity);
    } catch (error) {
      console.error('Failed to update entity:', error);
    }
  };

  const handleDeleteEntity = (entity: Entity) => {
    setEntityToDelete(entity);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!entityToDelete) return;

    try {
      await deleteEntity(entityToDelete.id);
      showToast(`Deleted ${entityToDelete.name}`, 'success');
    } catch (error) {
      console.error('Failed to delete entity:', error);
      showToast('Failed to delete entity', 'error');
    } finally {
      setDeleteConfirmOpen(false);
      setEntityToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setEntityToDelete(null);
  };

  // Render content based on selection type or active tool
  const renderContent = () => {
    // Show Entity Properties when an entity is selected
    if (selectedEntityId && selectedEntity) {
      return <EntityProperties entity={selectedEntity} onUpdateEntity={handleUpdateEntity} onDeleteEntity={handleDeleteEntity} />;
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
      case 'tileset':
        return <TilePalette tilesetId={selectedId} />;
      case 'map':
        // Show Tile Palette when a map is selected (for painting)
        // Get the tileset ID from the map's tilesetId
        return <MapProperties mapId={selectedId} />;
      case 'entity':
        // Entity properties shown above when selectedEntityId is set
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Entity?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{entityToDelete?.name}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
