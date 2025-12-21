'use client';

import { useEffect, useRef, useState } from 'react';
import { Map, Tileset, GameProject } from '@packages/types';
import TilePalette from './TilePalette';
import LayerManager from './LayerManager';
import { useToast } from '@/context/ToastContext';
import dynamic from 'next/dynamic';
import { TILESETS } from '@/config/tilesets';

const MapProperties = dynamic(() => import('./MapProperties'), { ssr: false });

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import SaveIcon from '@mui/icons-material/Save';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { usePreview } from '@/context/PreviewContext';

interface MapEditorProps {
  projectId: string;
  mapId: string;
  initialMapData?: Map;
}

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function MapEditor({ projectId, mapId, initialMapData }: MapEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapData, setMapData] = useState<Map | null>(initialMapData || null);
  const [tilesets, setTilesets] = useState<Tileset[]>([]);
  const [allMaps, setAllMaps] = useState<Map[]>([]);
  const [selectedSelection, setSelectedSelection] = useState<Selection | null>(null);
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const { showToast } = useToast();
  const { play } = usePreview();

  useEffect(() => {
    // Fetch tilesets including project-specific ones
    fetch(`/api/tilesets?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => setTilesets(data))
      .catch((err) => console.error('Failed to load tilesets', err));
  }, [projectId]);

  useEffect(() => {
    // Fetch all maps for the project
    fetch(`/api/projects/${projectId}/maps`)
      .then((res) => res.json())
      .then((data) => setAllMaps(data))
      .catch((err) => console.error('Failed to load maps', err));
  }, [projectId]);

  useEffect(() => {
    if (!mapData?.tilesetId || tilesets.length === 0) return;
    const tileset = tilesets.find((t) => t.id === mapData.tilesetId);
    if (!tileset) return;

    const img = new Image();
    img.src = tileset.image_source;
    img.onload = () => setTilesetImage(img);
  }, [mapData?.tilesetId, tilesets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData || !tilesetImage) return;

    const tileset = tilesets.find((t) => t.id === mapData.tilesetId);
    if (!tileset) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply zoom to canvas dimensions
    const tileSize = tileset.tile_width;
    const width = mapData.width * tileSize * zoom;
    const height = mapData.height * tileSize * zoom;

    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Enable pixel art scaling
    ctx.imageSmoothingEnabled = false;
    
    // Apply scale
    ctx.scale(zoom, zoom);

    // Draw grid
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1 / zoom; // Keep line width consistent

    for (let x = 0; x <= mapData.width * tileSize; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mapData.height * tileSize);
      ctx.stroke();
    }

    for (let y = 0; y <= mapData.height * tileSize; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mapData.width * tileSize, y);
      ctx.stroke();
    }

    // Draw tiles
    if (mapData.layers) {
      const cols = Math.floor(tilesetImage.width / tileset.tile_width);

      mapData.layers.forEach((layer) => {
        layer.data.forEach((tileId: number, index: number) => {
          if (tileId === -1) return; // Empty tile
          const x = (index % mapData.width) * tileSize;
          const y = Math.floor(index / mapData.width) * tileSize;
          
          const sx = (tileId % cols) * tileset.tile_width;
          const sy = Math.floor(tileId / cols) * tileset.tile_height;

          ctx.drawImage(
            tilesetImage,
            sx, sy, tileset.tile_width, tileset.tile_height,
            x, y, tileSize, tileSize
          );
        });
      });
    }

  }, [mapData, tilesetImage, tilesets, zoom]);

  const handlePropertyChange = (field: keyof Map, value: any) => {
    if (!mapData) return;
    
    const newMapData = { ...mapData, [field]: value };
    
    if (field === 'width' || field === 'height') {
      const newWidth = field === 'width' ? value : mapData.width;
      const newHeight = field === 'height' ? value : mapData.height;
      
      newMapData.layers = newMapData.layers.map(layer => {
        const newData = new Array(newWidth * newHeight).fill(-1);
        for (let y = 0; y < Math.min(mapData.height, newHeight); y++) {
          for (let x = 0; x < Math.min(mapData.width, newWidth); x++) {
            const oldIndex = y * mapData.width + x;
            const newIndex = y * newWidth + x;
            newData[newIndex] = layer.data[oldIndex];
          }
        }
        return { ...layer, data: newData };
      });
    }
    
    setMapData(newMapData);
  };

  const handleAddLayer = () => {
    if (!mapData) return;
    const newLayer = {
      name: `Layer ${mapData.layers.length + 1}`,
      data: new Array(mapData.width * mapData.height).fill(-1)
    };
    setMapData({ ...mapData, layers: [...mapData.layers, newLayer] });
    setActiveLayerIndex(mapData.layers.length);
  };

  const handleRemoveLayer = (index: number) => {
    if (!mapData || mapData.layers.length <= 1) return;
    const newLayers = mapData.layers.filter((_, i) => i !== index);
    setMapData({ ...mapData, layers: newLayers });
    if (activeLayerIndex >= index && activeLayerIndex > 0) {
      setActiveLayerIndex(activeLayerIndex - 1);
    } else if (activeLayerIndex >= newLayers.length) {
       setActiveLayerIndex(newLayers.length - 1);
    }
  };

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
    if (!selectedSelection || !canvasRef.current || !mapData || !tilesetImage) return;

    const tileset = tilesets.find((t) => t.id === mapData.tilesetId);
    if (!tileset) return;

    const rect = canvasRef.current.getBoundingClientRect();
    // Adjust for zoom: coordinate / zoom
    const x = Math.floor((e.clientX - rect.left) / (tileset.tile_width * zoom));
    const y = Math.floor((e.clientY - rect.top) / (tileset.tile_height * zoom));

    if (x >= 0 && x < mapData.width && y >= 0 && y < mapData.height) {
      const newMapData = { ...mapData };
      if (!newMapData.layers || newMapData.layers.length === 0) {
        newMapData.layers = [{ name: 'Layer 1', data: new Array(mapData.width * mapData.height).fill(-1) }];
      }
      
      const newLayerData = [...newMapData.layers[activeLayerIndex].data];
      const cols = Math.floor(tilesetImage.width / tileset.tile_width);

      // Loop through selection
      for (let sy = 0; sy < selectedSelection.height; sy++) {
        for (let sx = 0; sx < selectedSelection.width; sx++) {
          const targetX = x + sx;
          const targetY = y + sy;

          if (targetX < mapData.width && targetY < mapData.height) {
            const targetIndex = targetY * mapData.width + targetX;
            
            // Calculate source tile ID
            const sourceCol = selectedSelection.x + sx;
            const sourceRow = selectedSelection.y + sy;
            const tileId = sourceRow * cols + sourceCol;

            newLayerData[targetIndex] = tileId;
          }
        }
      }

      newMapData.layers[activeLayerIndex].data = newLayerData;
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

  const currentTileset = tilesets.find(t => t.id === mapData.tilesetId) || null;

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <MapProperties mapData={mapData} tilesets={tilesets} onChange={handlePropertyChange} />
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Paper sx={{ display: 'flex', alignItems: 'center', p: 0.5 }}>
            <IconButton onClick={() => setZoom(Math.max(0.5, zoom - 0.5))} disabled={zoom <= 0.5}>
              <ZoomOutIcon />
            </IconButton>
            <Typography sx={{ mx: 1 }}>{Math.round(zoom * 100)}%</Typography>
            <IconButton onClick={() => setZoom(Math.min(3, zoom + 0.5))} disabled={zoom >= 3}>
              <ZoomInIcon />
            </IconButton>
          </Paper>
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={<PlayArrowIcon />}
            onClick={() => {
              if (!mapData) return;
              
              // Update current map data in allMaps (to include unsaved changes)
              const updatedMaps = allMaps.map(m => m.id === mapData.id ? mapData : m);
              // Ensure current map is included (in case it's not in allMaps yet)
              const mapsToUse = updatedMaps.some(m => m.id === mapData.id) 
                ? updatedMaps 
                : [...updatedMaps, mapData];
              
              // Create minimal project object
              const project: GameProject = {
                id: projectId,
                name: '', // Not needed for preview
                maps: mapsToUse.map(m => m.id),
                characters: []
              };

              play({
                project,
                maps: mapsToUse,
                tilesets: TILESETS
              });
            }} 
            sx={{ height: 'fit-content' }}
          >
            Play
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<SaveIcon />}
            onClick={handleSave} 
            disabled={saving}
            sx={{ height: 'fit-content' }}
          >
            {saving ? 'Saving...' : 'Save Map'}
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Box sx={{ width: { xs: '100%', md: '25%' }, minWidth: 250 }}>
           <LayerManager 
            layers={mapData.layers} 
            activeLayerIndex={activeLayerIndex} 
            onSelectLayer={setActiveLayerIndex}
            onAddLayer={handleAddLayer}
            onRemoveLayer={handleRemoveLayer}
          />
          <TilePalette 
            tileset={currentTileset} 
            onSelectSelection={setSelectedSelection} 
            selection={selectedSelection} 
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 1, overflow: 'auto', height: 'calc(100vh - 200px)', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f5f5f5' }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ border: '1px solid #ccc', cursor: 'crosshair', imageRendering: 'pixelated', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', backgroundColor: 'white' }}
            />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
