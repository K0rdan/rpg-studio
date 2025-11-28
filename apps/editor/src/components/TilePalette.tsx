'use client';

import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface TilePaletteProps {
  onSelectTile: (tileId: number) => void;
  selectedTileId: number | null;
}

export default function TilePalette({ onSelectTile, selectedTileId }: TilePaletteProps) {
  // Placeholder tiles
  const tiles = [
    { id: 1, color: 'red' },
    { id: 2, color: 'green' },
    { id: 3, color: 'blue' },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Palette</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 32px)', gap: 1 }}>
        {tiles.map((tile) => (
          <Box
            key={tile.id}
            onClick={() => onSelectTile(tile.id)}
            sx={{
              width: 32,
              height: 32,
              backgroundColor: tile.color,
              border: selectedTileId === tile.id ? '2px solid white' : '1px solid #ccc',
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8,
              },
            }}
          />
        ))}
      </Box>
    </Paper>
  );
}
