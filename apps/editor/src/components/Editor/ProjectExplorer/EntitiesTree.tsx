'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { 
  Person, 
  Group, 
  Description,
  Inventory, 
  SwapHoriz,
  Bolt,
  SportsEsports,
  Add,
  Delete 
} from '@mui/icons-material';
import { useParams } from 'next/navigation';
import { useSelectionStore } from '@/stores/selectionStore';
import { useProjectExplorerStore } from '@/stores/projectExplorerStore';
import { useEntitySelectionStore } from '@/stores/entitySelectionStore';
import { useMapStore } from '@/stores/mapStore';
import { useEntities } from '@/hooks/useEntities';
import type { Entity } from '@packages/types';
import { CreateEntityDialog } from './CreateEntityDialog';
import { useToast } from '@/context/ToastContext';

export const EntitiesTree = () => {
  const params = useParams();
  const projectId = params?.projectId as string;
  const activeMapId = useMapStore((state) => state.activeMapId);
  
  // Use shared SWR hook — same data source as MapCanvas
  const { entities, isLoading, error, deleteEntity, mutate } = useEntities(projectId, activeMapId);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    entity: Entity;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<Entity | null>(null);
  
  const setSelection = useSelectionStore((state) => state.setSelection);
  const selectedItemId = useProjectExplorerStore((state) => state.selectedItemId);
  const setSelectedItem = useProjectExplorerStore((state) => state.setSelectedItem);
  const selectedEntityId = useEntitySelectionStore((state) => state.selectedEntityId);
  const setSelectedEntity = useEntitySelectionStore((state) => state.setSelectedEntity);
  const { showToast } = useToast();

  // Local state for expanded tree items — MUST be declared before any early returns
  const [expandedItems, setExpandedItems] = useState<string[]>(['entities-root']);

  // Determine which item should be highlighted in the tree
  // entitySelectionStore is the source of truth (set by both tree clicks and canvas clicks)
  const treeSelectedItem = selectedEntityId || selectedItemId || '';

  const handleEntitySelect = (entity: Entity) => {
    setSelectedItem(entity.id, 'entity');
    setSelection('entity', entity.id, entity);
    // Also set entitySelectionStore so Inspector shows EntityProperties
    setSelectedEntity(entity.id);
  };

  const handleEntityCreated = (newEntity: Entity) => {
    // Revalidate SWR cache to pick up new entity from server
    mutate();
    setSelectedItem(newEntity.id, 'entity');
    setSelection('entity', newEntity.id, newEntity);
    setSelectedEntity(newEntity.id);
  };

  const handleContextMenu = (event: React.MouseEvent, entity: Entity) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      entity,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleDeleteClick = () => {
    if (contextMenu) {
      setEntityToDelete(contextMenu.entity);
      setDeleteConfirmOpen(true);
      handleCloseContextMenu();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!entityToDelete) return;

    try {
      // Use shared SWR hook's deleteEntity — updates both tree AND canvas
      await deleteEntity(entityToDelete.id);

      // Clear selection if this entity was selected
      if (selectedItemId === entityToDelete.id) {
        setSelection(null, null, null);
        setSelectedItem(null, null);
        setSelectedEntity(null);
      }

      showToast(`Deleted ${entityToDelete.name}`, 'success');
    } catch (error) {
      console.error('Error deleting entity:', error);
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

  // Auto-expand the category that contains the selected entity
  // MUST be declared before any early returns (Rules of Hooks)
  useEffect(() => {
    if (!selectedEntityId) return;

    const entity = entities.find((e) => e.id === selectedEntityId);
    if (!entity) return;

    const template = entity.template || entity.type || '';
    const categoryMap: Record<string, string> = {
      player: 'entities-player',
      npc: 'entities-npcs',
      interactable: 'entities-interactables',
      container: 'entities-containers',
      teleporter: 'entities-teleporters',
      event_zone: 'entities-event-zones',
    };

    const category = categoryMap[template];
    if (category && !expandedItems.includes(category)) {
      setExpandedItems((prev) => [...prev, category]);
    }
  }, [selectedEntityId, entities]);

  const handleExpandedItemsChange = (event: React.SyntheticEvent | null, itemIds: string[]) => {
    setExpandedItems(itemIds);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading entities...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ py: 1 }}>
        Error loading entities
      </Typography>
    );
  }

  if (!activeMapId) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        Select a map to view entities
      </Typography>
    );
  }

  // Group entities by template, with fallback to type for backward compatibility
  const groupedEntities = {
    player: entities.filter((e) => e.template === 'player' || (!e.template && e.type === 'player')),
    npc: entities.filter((e) => e.template === 'npc' || (!e.template && e.type === 'npc')),
    interactable: entities.filter((e) => e.template === 'interactable'),
    container: entities.filter((e) => e.template === 'container'),
    teleporter: entities.filter((e) => e.template === 'teleporter'),
    event_zone: entities.filter((e) => e.template === 'event_zone'),
  };

  return (
    <>
      <SimpleTreeView
        expandedItems={expandedItems}
        onExpandedItemsChange={handleExpandedItemsChange}
        selectedItems={treeSelectedItem}
        sx={{ flexGrow: 1, overflowY: 'auto' }}
      >
        <TreeItem 
          itemId="entities-root" 
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>👤 Entities</Typography>
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateDialogOpen(true);
                }}
                sx={{ p: 0.5 }}
              >
                <Add fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          {/* Player */}
          <TreeItem itemId="entities-player" label="🎮 Player">
            {groupedEntities.player.length === 0 ? (
              <TreeItem
                itemId="entities-player-empty"
                label={
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    No player
                  </Typography>
                }
              />
            ) : (
              groupedEntities.player.map((entity) => (
                <TreeItem
                  key={entity.id}
                  itemId={entity.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{entity.name}</Typography>
                    </Box>
                  }
                  onClick={() => handleEntitySelect(entity)}
                  onContextMenu={(e) => handleContextMenu(e, entity)}
                />
              ))
            )}
          </TreeItem>

          {/* NPCs */}
          <TreeItem itemId="entities-npcs" label="💬 NPCs">
            {groupedEntities.npc.length === 0 ? (
              <TreeItem
                itemId="entities-npcs-empty"
                label={
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    No NPCs
                  </Typography>
                }
              />
            ) : (
              groupedEntities.npc.map((entity) => (
                <TreeItem
                  key={entity.id}
                  itemId={entity.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Group sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{entity.name}</Typography>
                    </Box>
                  }
                  onClick={() => handleEntitySelect(entity)}
                  onContextMenu={(e) => handleContextMenu(e, entity)}
                />
              ))
            )}
          </TreeItem>


          {/* Interactables */}
          <TreeItem itemId="entities-interactables" label="📋 Interactables">
            {groupedEntities.interactable.length === 0 ? (
              <TreeItem
                itemId="entities-interactables-empty"
                label={
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    No interactables
                  </Typography>
                }
              />
            ) : (
              groupedEntities.interactable.map((entity: Entity) => (
                <TreeItem
                  key={entity.id}
                  itemId={entity.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Description sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{entity.name}</Typography>
                    </Box>
                  }
                  onClick={() => handleEntitySelect(entity)}
                  onContextMenu={(e) => handleContextMenu(e, entity)}
                />
              ))
            )}
          </TreeItem>

          {/* Containers */}
          <TreeItem itemId="entities-containers" label="📦 Containers">
            {groupedEntities.container.length === 0 ? (
              <TreeItem
                itemId="entities-containers-empty"
                label={
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    No containers
                  </Typography>
                }
              />
            ) : (
              groupedEntities.container.map((entity: Entity) => (
                <TreeItem
                  key={entity.id}
                  itemId={entity.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Inventory sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{entity.name}</Typography>
                    </Box>
                  }
                  onClick={() => handleEntitySelect(entity)}
                  onContextMenu={(e) => handleContextMenu(e, entity)}
                />
              ))
            )}
          </TreeItem>

          {/* Teleporters */}
          <TreeItem itemId="entities-teleporters" label="🌀 Teleporters">
            {groupedEntities.teleporter.length === 0 ? (
              <TreeItem
                itemId="entities-teleporters-empty"
                label={
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    No teleporters
                  </Typography>
                }
              />
            ) : (
              groupedEntities.teleporter.map((entity: Entity) => (
                <TreeItem
                  key={entity.id}
                  itemId={entity.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SwapHoriz sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{entity.name}</Typography>
                    </Box>
                  }
                  onClick={() => handleEntitySelect(entity)}
                  onContextMenu={(e) => handleContextMenu(e, entity)}
                />
              ))
            )}
          </TreeItem>

          {/* Event Zones */}
          <TreeItem itemId="entities-event-zones" label="⚡ Event Zones">
            {groupedEntities.event_zone.length === 0 ? (
              <TreeItem
                itemId="entities-event-zones-empty"
                label={
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    No event zones
                  </Typography>
                }
              />
            ) : (
              groupedEntities.event_zone.map((entity: Entity) => (
                <TreeItem
                  key={entity.id}
                  itemId={entity.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Bolt sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{entity.name}</Typography>
                    </Box>
                  }
                  onClick={() => handleEntitySelect(entity)}
                  onContextMenu={(e) => handleContextMenu(e, entity)}
                />
              ))
            )}
          </TreeItem>
        </TreeItem>
      </SimpleTreeView>

      <CreateEntityDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        projectId={projectId}
        mapId={activeMapId || ''}
        onEntityCreated={handleEntityCreated}
      />

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

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
    </>
  );
};
