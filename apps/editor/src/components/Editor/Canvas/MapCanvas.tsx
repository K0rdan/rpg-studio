'use client';

import { Box, Typography, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  isPanFromPointerTravel,
  screenToWorld,
  wheelPanDelta,
  worldToTile,
} from '@/lib/canvasCamera';
import { isTypingTarget } from '@/lib/keyboardTarget';
import { emptyCellsForActiveLayer } from '@/lib/layerFocus';
import { collisionOverlayCells } from '@/lib/collisionOverlay';
import { ENTITY_TEMPLATES } from '@/constants/entityTemplates';
import { CanvasLoading } from './CanvasLoading';
import { CanvasError } from './CanvasError';
import { CanvasControls } from './CanvasControls';
import type { Entity } from '@packages/types';

export const MapCanvas = () => {
  const params = useParams();
  const projectId = params?.projectId as string;
  
  const {
    canvasRef,
    loading,
    error,
    currentMap,
    currentTileset,
    paintTile,
    setCanvasSize,
  } = useMapEngine(projectId);
  
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
  const activeLayer = useEditorStore((state) => state.map.activeLayer);
  const isolateLayers = useEditorStore((state) => state.map.isolateLayers);
  const collisionOverlayVisible = useEditorStore(
    (state) => state.map.collisionOverlayVisible,
  );
  
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
  const [canvasSize, setCanvasSizeState] = useState({ width: 800, height: 600 });
  
  // Entity overlay canvas ref
  const entityCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const emptyCellCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const collisionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panPointerIdRef = useRef<number | null>(null);
  const panButtonRef = useRef<number | null>(null);
  const secondaryDidPanRef = useRef(false);
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
      if (isTypingTarget(e.target)) {
        return;
      }
      if (e.code === 'Space' && !spacePressed) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(false);
        setIsPanning(false);
        if (panButtonRef.current === 0 && panPointerIdRef.current !== null) {
          const pointerId = panPointerIdRef.current;
          if (containerRef.current?.hasPointerCapture(pointerId)) {
            containerRef.current.releasePointerCapture(pointerId);
          }
          panPointerIdRef.current = null;
          panButtonRef.current = null;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || loading || !currentMap) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      setCanvasSizeState((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
      setCanvasSize(width, height);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [currentMap, loading, setCanvasSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || loading || !currentMap) return;

    const handleWheel = (event: WheelEvent) => {
      const delta = wheelPanDelta(event);
      if (!delta) return;
      event.preventDefault();
      pan(delta.x, delta.y);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [currentMap, loading, pan]);

  const openEntityContextMenu = (
    event: Pick<React.PointerEvent, 'clientX' | 'clientY'>,
  ) => {
    const tileCoords = screenToTileCoords(event);
    if (!tileCoords) return;

    const clickedEntity = entities.find(
      (entity) => entity.x === tileCoords.x && entity.y === tileCoords.y,
    );
    if (!clickedEntity) return;

    setSelectedEntity(clickedEntity.id);
    setSelectedItem(clickedEntity.id, 'entity');
    setSelection('entity', clickedEntity.id, clickedEntity);
    setCanvasContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      entity: clickedEntity,
    });
  };

  // Pointer handlers for panning, painting, and entity interaction.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const startsImmediatePan = e.button === 1 || (e.button === 0 && spacePressed);
    const startsSecondaryGesture = e.button === 2;

    if (startsImmediatePan || startsSecondaryGesture) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      panPointerIdRef.current = e.pointerId;
      panButtonRef.current = e.button;
      secondaryDidPanRef.current = false;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      setIsPanning(startsImmediatePan);
    } else if (e.button === 0 && activeTool === 'brush' && selectedTileIndex !== null) {
      setIsPainting(true);
      handlePaint(e);
    } else if (e.button === 0 && activeTool === 'entity') {
      handleEntityClick(e);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
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

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panPointerIdRef.current === e.pointerId) {
      if (
        panButtonRef.current === 2
        && !secondaryDidPanRef.current
        && !isPanFromPointerTravel(panStartRef.current, {
          x: e.clientX,
          y: e.clientY,
        })
      ) {
        return;
      }

      if (panButtonRef.current === 2) {
        secondaryDidPanRef.current = true;
      }
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      pan(dx, dy);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      setIsPanning(true);
    } else if (isPainting && activeTool === 'brush') {
      handlePaint(e);
    }
  };

  const finishPointerInteraction = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panPointerIdRef.current === e.pointerId) {
      if (panButtonRef.current === 2 && !secondaryDidPanRef.current) {
        openEntityContextMenu(e);
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      panPointerIdRef.current = null;
      panButtonRef.current = null;
      secondaryDidPanRef.current = false;
    }
    setIsPanning(false);
    setIsPainting(false);
  };

  const cancelPointerInteraction = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panPointerIdRef.current === e.pointerId) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      panPointerIdRef.current = null;
      panButtonRef.current = null;
      secondaryDidPanRef.current = false;
    }
    setIsPanning(false);
    setIsPainting(false);
  };

  const handlePointerLeave = () => {
    if (panPointerIdRef.current !== null) return;
    setIsPanning(false);
    setIsPainting(false);
  };

  // Convert screen coordinates to tile coordinates
  const screenToTileCoords = (
    e: Pick<React.PointerEvent, 'clientX' | 'clientY'>,
  ) => {
    if (!canvasRef.current || !currentMap || !currentTileset) return null;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const world = screenToWorld(
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
      { zoom, offsetX, offsetY },
    );
    const tile = worldToTile(
      world,
      currentTileset.tile_width,
      currentTileset.tile_height,
    );
    
    // Bounds check
    if (tile.x < 0 || tile.x >= currentMap.width || tile.y < 0 || tile.y >= currentMap.height) {
      return null;
    }
    
    return tile;
  };

  // Handle painting
  const handlePaint = (
    e: Pick<React.PointerEvent, 'clientX' | 'clientY'>,
  ) => {
    if (selectedTileIndex === null) return;
    
    const tileCoords = screenToTileCoords(e);
    if (!tileCoords) return;
    
    paintTile(tileCoords.x, tileCoords.y, selectedTileIndex);
    setMapDirty(true);
  };

  // Handle entity placement or selection
  const handleEntityClick = (
    e: Pick<React.PointerEvent, 'clientX' | 'clientY'>,
  ) => {
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
          showToast('A Player spawn already exists on this map. Only one is allowed.', 'warning');
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

  // Render empty-cell markers for the active layer
  useEffect(() => {
    if (!emptyCellCanvasRef.current || !currentMap || !currentTileset) return;

    const canvas = emptyCellCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cells = emptyCellsForActiveLayer(currentMap, activeLayer, isolateLayers);

    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY);

    const tileWidth = currentTileset.tile_width;
    const tileHeight = currentTileset.tile_height;
    const radius = Math.max(1, Math.min(tileWidth, tileHeight) * 0.08);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    cells.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(
        x * tileWidth + tileWidth / 2,
        y * tileHeight + tileHeight / 2,
        radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });

    ctx.restore();
  }, [
    currentMap,
    activeLayer,
    isolateLayers,
    currentTileset,
    zoom,
    offsetX,
    offsetY,
    canvasSize,
  ]);

  const emptyCellCount = emptyCellsForActiveLayer(currentMap, activeLayer, isolateLayers).length;
  const collisionCells = useMemo(
    () => currentMap && currentTileset
      ? collisionOverlayCells(currentMap, currentTileset)
      : [],
    [currentMap, currentTileset],
  );

  useEffect(() => {
    const canvas = collisionCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!collisionOverlayVisible || !currentTileset) return;

    const tileWidth = currentTileset.tile_width;
    const tileHeight = currentTileset.tile_height;

    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY);
    ctx.fillStyle = 'rgba(244, 67, 54, 0.35)';
    ctx.strokeStyle = 'rgba(255, 138, 128, 0.9)';
    ctx.lineWidth = 1;

    collisionCells.forEach(({ x, y }) => {
      ctx.fillRect(x * tileWidth, y * tileHeight, tileWidth, tileHeight);
      ctx.strokeRect(
        x * tileWidth + 0.5,
        y * tileHeight + 0.5,
        tileWidth - 1,
        tileHeight - 1,
      );
    });

    ctx.restore();
  }, [
    collisionCells,
    collisionOverlayVisible,
    currentTileset,
    zoom,
    offsetX,
    offsetY,
    canvasSize,
  ]);

  useEffect(() => {
    if (!entityCanvasRef.current || !currentMap || !currentTileset) return;
    
    const canvas = entityCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply same transform as map canvas
    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY);

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
  }, [
    entities,
    selectedEntityId,
    currentMap,
    currentTileset,
    zoom,
    offsetX,
    offsetY,
    canvasSize,
  ]);

  // Delete key handler for selected entity
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        return;
      }
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
    if (isPanning) return 'grabbing';
    if (spacePressed) return 'grab';
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
      data-testid="map-viewport"
      data-zoom={zoom}
      data-offset-x={offsetX}
      data-offset-y={offsetY}
      sx={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#1E1E1E',
        position: 'relative',
        overflow: 'hidden',
        cursor: getCursor(),
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerInteraction}
      onPointerCancel={cancelPointerInteraction}
      onPointerLeave={handlePointerLeave}
      onContextMenu={handleContextMenu}
    >
      <canvas
        id="map-canvas"
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
        }}
      />
      
      <canvas
        id="empty-cell-overlay"
        data-testid="empty-cell-overlay"
        data-empty-cell-count={emptyCellCount}
        ref={emptyCellCanvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          imageRendering: 'pixelated',
        }}
      />

      <canvas
        id="collision-overlay"
        data-testid="collision-overlay"
        data-blocking-cell-count={collisionCells.length}
        ref={collisionCanvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: collisionOverlayVisible ? 'block' : 'none',
          pointerEvents: 'none',
          imageRendering: 'pixelated',
        }}
      />
      
      {/* Entity overlay canvas */}
      <canvas
        id="entity-overlay-canvas"
        ref={entityCanvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          imageRendering: 'pixelated',
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
