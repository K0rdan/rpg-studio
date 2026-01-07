'use client';

import { useRef, useEffect, useState } from 'react';
import { Tileset } from '@packages/types';
import ZoomControls from './ZoomControls';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TilePaletteProps {
  tileset: Tileset | null;
  onSelectSelection: (selection: Selection | null) => void;
  selection: Selection | null;
}

const BASE_TILE_SIZE = 32; // Target display size

export default function TilePalette({ tileset, onSelectSelection, selection }: TilePaletteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [paletteZoom, setPaletteZoom] = useState(100); // Percentage (50-400)

  useEffect(() => {
    if (!tileset || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    image.src = tileset.image_source;
    image.onload = () => {
      // Calculate zoom scale and scaled dimensions
      // BASE_TILE_SIZE is our target display size (32px)
      // tileset.tile_width is the source image tile size (could be 128px)
      const zoomScale = paletteZoom / 100;
      const displayTileSize = BASE_TILE_SIZE * zoomScale;
      
      const cols = Math.floor(image.width / tileset.tile_width);
      const rows = Math.ceil(image.height / tileset.tile_height);
      
      canvas.width = cols * displayTileSize;
      canvas.height = rows * displayTileSize;
      
      // Enable pixel art scaling
      ctx.imageSmoothingEnabled = false;
      
      // Draw each tile from source to scaled display size
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const sx = col * tileset.tile_width;
          const sy = row * tileset.tile_height;
          const dx = col * displayTileSize;
          const dy = row * displayTileSize;
          
          ctx.drawImage(
            image,
            sx, sy, tileset.tile_width, tileset.tile_height,
            dx, dy, displayTileSize, displayTileSize
          );
        }
      }
      
      // Draw grid overlay
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      
      for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * displayTileSize, 0);
        ctx.lineTo(x * displayTileSize, canvas.height);
        ctx.stroke();
      }
      
      for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * displayTileSize);
        ctx.lineTo(canvas.width, y * displayTileSize);
        ctx.stroke();
      }

      // Highlight selection
      if (selection) {
        const x = selection.x * displayTileSize;
        const y = selection.y * displayTileSize;
        const w = selection.width * displayTileSize;
        const h = selection.height * displayTileSize;

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        
        // Semi-transparent fill
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(x, y, w, h);
      }
    };
  }, [tileset, selection, paletteZoom]);

  const getTilePos = (e: React.MouseEvent) => {
    if (!tileset || !canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const zoomScale = paletteZoom / 100;
    const displayTileSize = BASE_TILE_SIZE * zoomScale;
    const x = Math.floor((e.clientX - rect.left) / displayTileSize);
    const y = Math.floor((e.clientY - rect.top) / displayTileSize);
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getTilePos(e);
    setStartPos(pos);
    setIsSelecting(true);
    onSelectSelection({ x: pos.x, y: pos.y, width: 1, height: 1 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !startPos) return;
    const current = getTilePos(e);
    
    const x = Math.min(startPos.x, current.x);
    const y = Math.min(startPos.y, current.y);
    const width = Math.abs(current.x - startPos.x) + 1;
    const height = Math.abs(current.y - startPos.y) + 1;
    
    onSelectSelection({ x, y, width, height });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setStartPos(null);
  };

  if (!tileset) return <Paper sx={{ p: 2 }}>Select a tileset</Paper>;

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Palette</Typography>
        <ZoomControls
          zoom={paletteZoom}
          onZoomChange={setPaletteZoom}
          compact={true}
          showLabel={false}
        />
      </Box>
      <Box sx={{ overflow: 'auto', maxHeight: '600px' }}>
        <canvas 
          ref={canvasRef} 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: 'crosshair', display: 'block' }}
        />
      </Box>
    </Paper>
  );
}
