'use client';

import { useRef, useEffect, useState } from 'react';
import { Tileset } from '@packages/types';
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

export default function TilePalette({ tileset, onSelectSelection, selection }: TilePaletteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (!tileset || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    image.src = tileset.image_source;
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      
      // Draw grid overlay
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      
      for (let x = 0; x <= image.width; x += tileset.tile_width) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, image.height);
        ctx.stroke();
      }
      
      for (let y = 0; y <= image.height; y += tileset.tile_height) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(image.width, y);
        ctx.stroke();
      }

      // Highlight selection
      if (selection) {
        const x = selection.x * tileset.tile_width;
        const y = selection.y * tileset.tile_height;
        const w = selection.width * tileset.tile_width;
        const h = selection.height * tileset.tile_height;

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        
        // Semi-transparent fill
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(x, y, w, h);
      }
    };
  }, [tileset, selection]);

  const getTilePos = (e: React.MouseEvent) => {
    if (!tileset || !canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / tileset.tile_width);
    const y = Math.floor((e.clientY - rect.top) / tileset.tile_height);
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
    <Paper sx={{ p: 2, overflow: 'auto', maxHeight: '600px' }}>
      <Typography variant="h6" gutterBottom>Palette</Typography>
      <canvas 
        ref={canvasRef} 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: 'crosshair' }}
      />
    </Paper>
  );
}
