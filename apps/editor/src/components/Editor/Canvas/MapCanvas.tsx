'use client';

import { Box, Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useMapEngine } from '@/hooks/useMapEngine';
import { useCanvasShortcuts } from '@/hooks/useCanvasShortcuts';
import { useViewportStore } from '@/stores/viewportStore';
import { useEditorStore } from '@/stores/editorStore';
import { useTileSelectionStore } from '@/stores/tileSelectionStore';
import { CanvasLoading } from './CanvasLoading';
import { CanvasError } from './CanvasError';
import { CanvasControls } from './CanvasControls';

export const MapCanvas = () => {
  const params = useParams();
  const projectId = params?.projectId as string;
  
  const { canvasRef, loading, error, currentMap, currentTileset, paintTile } = useMapEngine(projectId);
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
  
  // Enable keyboard shortcuts
  useCanvasShortcuts();
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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
      
      <CanvasControls />
    </Box>
  );
};
