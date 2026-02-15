import { Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import { useState, useEffect } from 'react';
import { useTileSelectionStore } from '@/stores/tileSelectionStore';
import type { Tileset } from '@packages/types';

interface TileGridProps {
  tileset: Tileset | null;
}

export const TileGrid = ({ tileset }: TileGridProps) => {
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const selectedTileIndex = useTileSelectionStore((state) => state.selectedTileIndex);
  const setSelectedTile = useTileSelectionStore((state) => state.setSelectedTile);

  // Load tileset image
  useEffect(() => {
    if (!tileset) {
      setTilesetImage(null);
      return;
    }

    setLoading(true);
    setError(null);

    const img = new Image();
    img.crossOrigin = 'anonymous'; // For CORS if needed
    
    img.onload = () => {
      setTilesetImage(img);
      setImageSize({ width: img.width, height: img.height });
      setLoading(false);
    };

    img.onerror = () => {
      setError('Failed to load tileset image');
      setLoading(false);
    };

    img.src = tileset.image_source;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [tileset]);

  if (!tileset) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Select a tileset to view tiles
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  if (!tilesetImage) {
    return null;
  }

  // Use source tile sizes for grid calculation, fall back to display sizes
  const sourceTileWidth = tileset.source_tile_width || tileset.tile_width;
  const sourceTileHeight = tileset.source_tile_height || tileset.tile_height;
  
  // Display sizes for rendering
  const displayTileWidth = tileset.tile_width;
  const displayTileHeight = tileset.tile_height;
  
  // Calculate scale factor (how much to scale DOWN the background image)
  // If source is 128px and display is 32px, scale factor is 32/128 = 0.25
  // This makes each 128px source tile appear as 32px
  const scale = displayTileWidth / sourceTileWidth;

  // Calculate grid dimensions based on SOURCE tile sizes
  const columns = Math.floor(imageSize.width / sourceTileWidth);
  const rows = Math.floor(imageSize.height / sourceTileHeight);
  const totalTiles = columns * rows;

  const handleTileClick = (index: number) => {
    const x = index % columns;
    const y = Math.floor(index / columns);
    setSelectedTile(index, { x, y });
  };

  return (
    <Box
      id="tile-grid"
      sx={{
        p: 2,
        overflow: 'auto',
        flex: 1,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, ${displayTileWidth}px)`,
          gap: 0,
          width: 'fit-content',
        }}
      >
        {Array.from({ length: totalTiles }).map((_, index) => {
          const x = index % columns;
          const y = Math.floor(index / columns);
          const isSelected = selectedTileIndex === index;

          return (
            <Tooltip
              key={index}
              title={`Tile (${x}, ${y})`}
              placement="top"
              arrow
            >
              <Box
                onClick={() => handleTileClick(index)}
                sx={{
                  width: displayTileWidth,
                  height: displayTileHeight,
                  backgroundImage: `url(${tileset.image_source})`,
                  // Use DISPLAY tile sizes for positioning (after scaling)
                  backgroundPosition: `-${x * displayTileWidth}px -${y * displayTileHeight}px`,
                  backgroundRepeat: 'no-repeat',
                  // Scale DOWN the background image so source tiles appear at display size
                  backgroundSize: `${imageSize.width * scale}px ${imageSize.height * scale}px`,
                  imageRendering: 'pixelated',
                  cursor: 'pointer',
                  border: isSelected ? '3px solid #2196f3' : '1px solid transparent',
                  boxShadow: isSelected ? '0 0 8px rgba(33, 150, 243, 0.5)' : 'none',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: isSelected ? '#2196f3' : 'rgba(255, 255, 255, 0.3)',
                  },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        {columns} × {rows} tiles ({totalTiles} total) • {displayTileWidth}×{displayTileHeight}px display
      </Typography>
    </Box>
  );
};
