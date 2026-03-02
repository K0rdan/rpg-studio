'use client';

import { Box, Typography, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { Delete, Settings } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useMapEngine } from '@/hooks/useMapEngine';
import { useCanvasShortcuts } from '@/hooks/useCanvasShortcuts';
import { useViewportStore } from '@/stores/viewportStore';
import { useEditorStore } from '@/stores/editorStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useProjectExplorerStore } from '@/stores/projectExplorerStore';
import { useTileSelectionStore } from '@/stores/tileSelectionStore';
import { useEntitySelectionStore } from '@/stores/entitySelectionStore';
import { useMapStore } from '@/stores/mapStore';
import { useEntities } from '@/hooks/useEntities';
import { useToast } from '@/context/ToastContext';
import { ENTITY_TEMPLATES } from '@/constants/entityTemplates';
import { CanvasLoading } from './CanvasLoading';
import { CanvasError } from './CanvasError';
import { CanvasControls } from './CanvasControls';
import type { Entity } from '@packages/types';

export const MapCanvas = () => {
  const params = useParams();
  const projectId = params?.projectId as string;
  
  const { canvasRef, loading, error, currentMap, currentTileset, paintTile } = useMapEngine(projectId);
  
  // Get active map ID from map store
  // Get active map ID from map store
  const activeMapId = useMapStore((state) => state.activeMapId);
  const setSelection = useSelectionStore((state) => state.setSelection);
  const setSelectedItem = useProjectExplorerStore((state) => state.setSelectedItem);
  const offsetX = useViewportStore((state) => state.offsetX);
  const offsetY = useViewportStore((state) => state.offsetY);
  const zoom = useViewportStore((state) => state.zoom);
  const pan = useViewportStore((state) => state.pan);
  
  // Editor state
  const activeTool = useEditorStore((state) => state.tools.activeTool);
  const isPainting = useEditorStore((state) => state.painting.isPainting);
  const setIsPainting = useEditorStore((state) => state.setIsPainting);
  const setMapDirty = useEditorStore((state) => state.setMapDirty);
  
  // Tile selection
  const selectedTileIndex = useTileSelectionStore((state) => state.selectedTileIndex);
  
  // Entity selection and data
  const selectedTemplateId = useEntitySelectionStore((state) => state.selectedTemplateId);
  const selectedEntityId = useEntitySelectionStore((state) => state.selectedEntityId);
  const setSelectedEntity = useEntitySelectionStore((state) => state.setSelectedEntity);
  const { entities, addEntity, deleteEntity } = useEntities(projectId, activeMapId);
  const { showToast } = useToast();
  
  // Enable keyboard shortcuts
  useCanvasShortcuts();
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  
  // Entity overlay canvas ref
  const entityCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas context menu state
  const [canvasContextMenu, setCanvasContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    entity: Entity;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<Entity | null>(null);

  // Track space key for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed]);

  // Mouse handlers for panning and painting
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle mouse button or left mouse + space = pan
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
    // Left click with brush tool = paint
    else if (e.button === 0 && activeTool === 'brush' && selectedTileIndex !== null) {
      setIsPainting(true);
      handlePaint(e);
    }
    // Left click with entity tool = place or select entity
    else if (e.button === 0 && activeTool === 'entity') {
      handleEntityClick(e);
    }
  };

  // Right-click context menu on canvas entities
  const handleContextMenu = (e: React.MouseEvent) => {
    const tileCoords = screenToTileCoords(e);
    if (!tileCoords) return;

    const clickedEntity = entities.find(
      (entity) => entity.x === tileCoords.x && entity.y === tileCoords.y
    );

    if (clickedEntity) {
      e.preventDefault();
      // Sync all selection stores
      setSelectedEntity(clickedEntity.id);
      setSelectedItem(clickedEntity.id, 'entity');
      setSelection('entity', clickedEntity.id, clickedEntity);
      
      setCanvasContextMenu({
        mouseX: e.clientX,
        mouseY: e.clientY,
        entity: clickedEntity,
      });
    }
  };

  const handleCloseCanvasContextMenu = () => {
    setCanvasContextMenu(null);
  };

  const handleCanvasDeleteClick = () => {
    if (canvasContextMenu) {
      setEntityToDelete(canvasContextMenu.entity);
      setDeleteConfirmOpen(true);
      handleCloseCanvasContextMenu();
    }
  };

  const handleCanvasDeleteConfirm = async () => {
    if (!entityToDelete) return;
    try {
      await deleteEntity(entityToDelete.id);
      if (selectedEntityId === entityToDelete.id) {
        setSelectedEntity(null);
      }
      showToast(`Deleted ${entityToDelete.name}`, 'success');
    } catch (err) {
      console.error('Error deleting entity:', err);
      showToast('Failed to delete entity', 'error');
    } finally {
      setDeleteConfirmOpen(false);
      setEntityToDelete(null);
    }
  };

  const handleCanvasDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setEntityToDelete(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      pan(dx, dy);
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
    // Paint while dragging
    else if (isPainting && activeTool === 'brush') {
      handlePaint(e);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsPainting(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    setIsPainting(false);
  };

  // Convert screen coordinates to tile coordinates
  const screenToTileCoords = (e: React.MouseEvent) => {
    if (!canvasRef.current || !currentMap || !currentTileset) return null;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Account for zoom and pan
    const worldX = (canvasX / zoom) - offsetX;
    const worldY = (canvasY / zoom) - offsetY;
    
    // Use display tile size for coordinate calculation
    const tileWidth = currentTileset.tile_width;
    const tileHeight = currentTileset.tile_height;
    
    const tileX = Math.floor(worldX / tileWidth);
    const tileY = Math.floor(worldY / tileHeight);
    
    // Bounds check
    if (tileX < 0 || tileX >= currentMap.width || tileY < 0 || tileY >= currentMap.height) {
      return null;
    }
    
    return { x: tileX, y: tileY };
  };

  // Handle painting
  const handlePaint = (e: React.MouseEvent) => {
    if (selectedTileIndex === null) return;
    
    const tileCoords = screenToTileCoords(e);
    if (!tileCoords) return;
    
    paintTile(tileCoords.x, tileCoords.y, selectedTileIndex);
    setMapDirty(true);
  };

  // Handle entity placement or selection
  const handleEntityClick = (e: React.MouseEvent) => {
    const tileCoords = screenToTileCoords(e);
    if (!tileCoords) return;

    // Check if clicking on existing entity
    const clickedEntity = entities.find(
      (entity) => entity.x === tileCoords.x && entity.y === tileCoords.y
    );

    if (clickedEntity) {
      // Select existing entity - sync all selection stores
      setSelectedEntity(clickedEntity.id);
      setSelectedItem(clickedEntity.id, 'entity');
      setSelection('entity', clickedEntity.id, clickedEntity);
    } else if (selectedTemplateId) {
      // Place new entity from template
      const template = ENTITY_TEMPLATES.find((t) => t.id === selectedTemplateId);
      if (!template) return;

      // Validate: Only one player entity allowed per map
      if (template.id === 'player') {
        const existingPlayer = entities.find(e => e.type === 'player');
        if (existingPlayer) {
          console.warn('Only one player entity allowed per map');
          return;
        }
      }

      // Create new entity without ID - server will generate it
      const newEntity = {
        ...template.defaultEntity,
        x: tileCoords.x,
        y: tileCoords.y,
      };

      addEntity(newEntity);
      setMapDirty(true);
    } else {
      // Clicking on empty space with no template selected - deselect entity
      setSelectedEntity(null);
    }
  };

  // Render entities on overlay canvas
  useEffect(() => {
    if (!entityCanvasRef.current || !currentMap || !currentTileset) return;
    
    const canvas = entityCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply same transform as map canvas
    ctx.save();
    ctx.scale(zoom, zoom);

    const tileWidth = currentTileset.tile_width;
    const tileHeight = currentTileset.tile_height;

    // Render each entity
    entities.forEach((entity) => {
      const x = entity.x * tileWidth;
      const y = entity.y * tileHeight;

      // Draw entity placeholder (purple square)
      ctx.fillStyle = '#9C27B0';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x, y, tileWidth, tileHeight);
      ctx.globalAlpha = 1.0;

      // Draw entity border
      ctx.strokeStyle = '#9C27B0';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, tileWidth, tileHeight);

      // Draw entity icon (person icon)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${tileWidth * 0.5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👤', x + tileWidth / 2, y + tileHeight / 2);

      // Highlight selected entity
      if (selectedEntityId === entity.id) {
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 4;
        ctx.strokeRect(x - 2, y - 2, tileWidth + 4, tileHeight + 4);
      }
    });

    ctx.restore();
  }, [entities, selectedEntityId, currentMap, currentTileset, zoom]);

  // Delete key handler for selected entity
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEntityId && !deleteConfirmOpen) {
        const entity = entities.find((ent) => ent.id === selectedEntityId);
        if (entity) {
          e.preventDefault();
          setEntityToDelete(entity);
          setDeleteConfirmOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntityId, entities, deleteConfirmOpen]);

  // Cursor style
  const getCursor = () => {
    if (spacePressed) return isPanning ? 'grabbing' : 'grab';
    return 'default';
  };

  if (loading) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: '#1E1E1E',
        }}
      >
        <CanvasLoading />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: '#1E1E1E',
        }}
      >
        <CanvasError error={error} />
      </Box>
    );
  }

  if (!currentMap) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: '#1E1E1E',
        }}
      >
        <Typography variant="body1" color="text.secondary">
          No maps in this project. Create a map to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#1E1E1E',
        position: 'relative',
        overflow: 'hidden',
        cursor: getCursor(),
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
    >
      <canvas
        id="map-canvas"
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          border: '1px solid #444',
          imageRendering: 'pixelated',
          transform: `translate(${offsetX}px, ${offsetY}px)`,
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      />
      
      {/* Entity overlay canvas */}
      <canvas
        id="entity-overlay-canvas"
        ref={entityCanvasRef}
        width={800}
        height={600}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          imageRendering: 'pixelated',
          transform: `translate(${offsetX}px, ${offsetY}px)`,
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      />
      
      <CanvasControls />

      {/* Canvas Entity Context Menu */}
      <Menu
        open={canvasContextMenu !== null}
        onClose={handleCloseCanvasContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          canvasContextMenu !== null
            ? { top: canvasContextMenu.mouseY, left: canvasContextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleCanvasDeleteClick}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Canvas Entity Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onClose={handleCanvasDeleteCancel}>
        <DialogTitle>Delete Entity?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{entityToDelete?.name}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCanvasDeleteCancel}>Cancel</Button>
          <Button onClick={handleCanvasDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
