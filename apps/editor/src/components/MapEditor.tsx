'use client';

import { useEffect, useRef, useState } from 'react';
import { Map } from 'types';
import TilePalette from './TilePalette';
import { useToast } from '@/context/ToastContext';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import SaveIcon from '@mui/icons-material/Save';

interface MapEditorProps {
  projectId: string;
  mapId: string;
  initialMapData?: Map;
}

export default function MapEditor({ projectId, mapId, initialMapData }: MapEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapData, setMapData] = useState<Map | null>(initialMapData || null);
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!mapData && mapId) {
      const fetchMap = async () => {
         // Fetch logic handled by page for now, but good to have fallback
      };
      fetchMap();
    }
  }, [mapId, mapData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tileSize = 32;
    const width = mapData.width * tileSize;
    const height = mapData.height * tileSize;

    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw tiles
    if (mapData.layers && mapData.layers.length > 0) {
      const layer = mapData.layers[0];
      layer.data.forEach((tileId: number, index: number) => {
        if (tileId === 0) return; // Empty tile
        const x = (index % mapData.width) * tileSize;
        const y = Math.floor(index / mapData.width) * tileSize;
        
        // Placeholder colors for tiles
        ctx.fillStyle = tileId === 1 ? 'red' : tileId === 2 ? 'green' : 'blue';
        ctx.fillRect(x, y, tileSize, tileSize);
      });
    }

  }, [mapData]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    paintTile(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing) {
      paintTile(e);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const paintTile = (e: React.MouseEvent) => {
    if (!selectedTileId || !canvasRef.current || !mapData) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / 32);
    const y = Math.floor((e.clientY - rect.top) / 32);

    if (x >= 0 && x < mapData.width && y >= 0 && y < mapData.height) {
      const index = y * mapData.width + x;
      
      const newMapData = { ...mapData };
      if (!newMapData.layers || newMapData.layers.length === 0) {
        newMapData.layers = [{ name: 'Layer 1', data: new Array(mapData.width * mapData.height).fill(0) }];
      }
      
      // Clone the layer data to avoid mutation
      const newLayerData = [...newMapData.layers[0].data];
      newLayerData[index] = selectedTileId;
      newMapData.layers[0].data = newLayerData;
      
      setMapData(newMapData);
    }
  };

  const handleSave = async () => {
    if (!mapData) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/maps/${mapData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mapData),
      });

      if (!response.ok) {
        throw new Error('Failed to save map');
      }
      
      showToast('Map saved!', 'success');
    } catch (error) {
      console.error('Error saving map:', error);
      showToast('Failed to save map', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!mapData) return <div>Loading map...</div>;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />}
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Map'}
        </Button>
      </Box>
      <Stack direction="row" spacing={2}>
        <Box>
          <TilePalette onSelectTile={setSelectedTileId} selectedTileId={selectedTileId} />
        </Box>
        <Paper sx={{ p: 1, overflow: 'auto' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ border: '1px solid #ccc', cursor: 'crosshair' }}
          />
        </Paper>
      </Stack>
    </Box>
  );
}
