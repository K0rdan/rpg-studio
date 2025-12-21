'use client';

import { useEffect, useRef, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import React from 'react';
import { GameEngine } from '@packages/core';
import { GameProject, Map, Tileset } from '@packages/types';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<unknown>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    project: GameProject;
    maps: Map[];
    tilesets?: Tileset[];
  };
}

export default function PreviewModal({ isOpen, onClose, data }: PreviewModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showTestPattern, setShowTestPattern] = useState(false);
  const [tilesetLoaded, setTilesetLoaded] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  // Callback ref to detect when canvas is mounted
  const canvasCallbackRef = (node: HTMLCanvasElement | null) => {
    if (node) {
      console.log('✅ Canvas mounted!');
      (canvasRef as any).current = node;
      setCanvasReady(true);
    } else {
      console.log('Canvas unmounted');
      setCanvasReady(false);
    }
  };

  // Wait for canvas to be available after dialog opens
  useEffect(() => {
    console.log('=== PreviewModal: Initialization check ===');
    console.log('isOpen:', isOpen);
    console.log('canvasReady:', canvasReady);
    console.log('canvasRef.current:', !!canvasRef.current);
    console.log('engineRef.current:', !!engineRef.current);
    
    if (!isOpen || !canvasReady || !canvasRef.current || engineRef.current) {
      if (!isOpen) console.log('Preview not open');
      if (!canvasReady) console.log('⚠️ Canvas not ready yet - waiting for mount');
      if (!canvasRef.current) console.log('⚠️ Canvas ref not available');
      if (engineRef.current) console.log('Engine already initialized');
      return;
    }

    console.log('🎮 Preview Modal: Canvas ready, initializing GameEngine...');
    console.log('Project:', data.project);
    console.log('Maps:', data.maps);
    console.log('Tilesets:', data.tilesets);
    
    const engine = new GameEngine(canvasRef.current);
    console.log('✅ GameEngine instance created');
    
    // Test if tileset loads (for UI status)
    if (data.tilesets && data.tilesets.length > 0 && data.tilesets[0]?.image_source) {
      const testImage = new Image();
      testImage.onload = () => {
        console.log('✅ Tileset image test load successful');
        setTilesetLoaded(true);
      };
      testImage.onerror = (error) => {
        console.error('❌ Tileset image test load failed:', error);
        console.error('Image src was:', testImage.src);
        setTilesetLoaded(false);
      };
      testImage.src = data.tilesets[0].image_source;
      console.log('Testing tileset load from:', testImage.src);
    } else {
      console.warn('⚠️ No tilesets available for preview');
      setTilesetLoaded(false);
    }
    
    console.log('🔄 Calling engine.init()...');
    engine.init(data.project, data.maps, data.tilesets || [])
      .then(() => {
        console.log('✅ engine.init() completed successfully');
        console.log('🎬 Starting game loop...');
        engine.start();
        engineRef.current = engine;
        console.log('✅ GameEngine fully initialized and started');
      })
      .catch((error) => {
        console.error('❌ engine.init() failed:', error);
        console.error('Error stack:', error.stack);
      });
  }, [isOpen, canvasReady, data]); // Watch canvasReady state

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        console.log('🛑 Preview Modal: Stopping GameEngine');
        engineRef.current.stop();
        engineRef.current = null;
      }
    };
  }, []);

  // Visual debugging overlays
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw test pattern
    if (showTestPattern) {
      ctx.save();
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(10, 10, 50, 50);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(70, 10, 50, 50);
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(130, 10, 50, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px monospace';
      ctx.fillText('TEST PATTERN', 10, 80);
      ctx.restore();
    }

    // Draw grid overlay
    if (showGrid && data.maps?.[0]) {
      const map = data.maps[0];
      const tileset = data.tilesets?.find(t => t.id === map.tilesetId);
      const tileWidth = tileset?.tile_width || 128;
      const tileHeight = tileset?.tile_height || 128;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.lineWidth = 1;

      // Draw vertical lines
      for (let x = 0; x <= map.width * tileWidth; x += tileWidth) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, map.height * tileHeight);
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let y = 0; y <= map.height * tileHeight; y += tileHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(map.width * tileWidth, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [showGrid, showTestPattern, data]);

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleResume = () => {
     if (engineRef.current) {
      engineRef.current.resume();
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    onClose();
  };

  return (
    <Dialog
      fullScreen
      open={isOpen}
      onClose={handleStop}
      TransitionComponent={Transition}
    >
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleStop}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Game Preview (Direct Engine)
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isPaused ? (
               <IconButton color="inherit" onClick={handleResume}>
                 <PlayArrowIcon />
               </IconButton>
            ) : (
               <IconButton color="inherit" onClick={handlePause}>
                 <PauseIcon />
               </IconButton>
            )}
            <IconButton color="inherit" onClick={handleStop}>
              <StopIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, bgcolor: '#000', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Debug Info Panel */}
        <Box sx={{ bgcolor: '#1a1a1a', color: '#fff', p: 2, fontSize: '0.75rem', fontFamily: 'monospace' }}>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Debug Info:
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            → Maps: {data.maps?.length || 0} | Active Map: {data.maps?.[0]?.name || 'None'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            → Tileset ID: {data.maps?.[0]?.tilesetId || 'None'} | Available Tilesets: {data.tilesets?.length || 0}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            → Layers: {data.maps?.[0]?.layers?.length || 0} | 
            Layer 1 Tiles: {data.maps?.[0]?.layers?.[0]?.data?.filter((t: number) => t !== -1).length || 0} painted
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            → Map Size: {data.maps?.[0]?.width || 0}x{data.maps?.[0]?.height || 0}
          </Typography>
          {data.maps?.[0]?.layers?.[0]?.data?.filter((t: number) => t !== -1).length === 0 && (
            <Typography variant="caption" sx={{ display: 'block', color: '#ff9800', mt: 1 }}>
              ⚠️ No tiles painted on this map. Paint some tiles in the editor first!
            </Typography>
          )}
          <Typography variant="caption" sx={{ display: 'block', color: tilesetLoaded ? '#4caf50' : '#f44336', mt: 1 }}>
            {tilesetLoaded ? '✅' : '❌'} Tileset Image: {tilesetLoaded ? 'Loaded' : 'Failed to load'}
          </Typography>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={showGrid} 
                  onChange={(e) => setShowGrid(e.target.checked)}
                  size="small"
                  sx={{ color: '#fff' }}
                />
              }
              label={<Typography variant="caption">Show Grid</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox 
                  checked={showTestPattern} 
                  onChange={(e) => setShowTestPattern(e.target.checked)}
                  size="small"
                  sx={{ color: '#fff' }}
                />
              }
              label={<Typography variant="caption">Test Pattern</Typography>}
            />
            <Button 
              size="small" 
              variant="outlined"
              sx={{ color: '#fff', borderColor: '#fff' }}
              onClick={() => {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                  const imageData = ctx.getImageData(0, 0, 800, 600);
                  let nonBlackPixels = 0;
                  for (let i = 0; i < imageData.data.length; i += 4) {
                    if (imageData.data[i] !== 0 || imageData.data[i+1] !== 0 || imageData.data[i+2] !== 0) {
                      nonBlackPixels++;
                    }
                  }
                  console.log(`Canvas pixels: ${nonBlackPixels} non-black out of ${imageData.data.length / 4}`);
                  alert(`Non-black pixels: ${nonBlackPixels} / ${imageData.data.length / 4}`);
                }
              }}
            >
              Check Canvas
            </Button>
          </Box>
        </Box>
        
        {/* Canvas Container */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          // Checkerboard pattern to visualize transparency
          backgroundImage: `
            linear-gradient(45deg, #2a2a2a 25%, transparent 25%),
            linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
            linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}>
          <canvas
             ref={canvasCallbackRef}
             width={800}
             height={600}
             style={{ 
               imageRendering: 'pixelated',
               boxShadow: '0 0 20px rgba(0,0,0,0.5)',
               border: '2px solid #333',
               // Canvas background can be transparent or solid
               backgroundColor: 'transparent'
             }}
          />
        </Box>
      </Box>
    </Dialog>
  );
}
