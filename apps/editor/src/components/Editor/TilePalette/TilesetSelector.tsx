import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { useTileSelectionStore } from '@/stores/tileSelectionStore';
import type { Tileset } from '@packages/types';

interface TilesetSelectorProps {
  tilesets: Tileset[];
  loading?: boolean;
  gridSize?: { width: number; height: number };
}

export const TilesetSelector = ({
  tilesets,
  loading = false,
  gridSize,
}: TilesetSelectorProps) => {
  const selectedTilesetId = useTileSelectionStore((state) => state.selectedTilesetId);
  const setSelectedTileset = useTileSelectionStore((state) => state.setSelectedTileset);

  const handleChange = (tilesetId: string) => {
    setSelectedTileset(tilesetId);
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Loading tilesets...
        </Typography>
      </Box>
    );
  }

  if (tilesets.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No tilesets in this project. Create a tileset to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <FormControl fullWidth size="small">
        <InputLabel id="tileset-select-label">Tileset</InputLabel>
        <Select
          labelId="tileset-select-label"
          id="tileset-select"
          value={selectedTilesetId || ''}
          label="Tileset"
          onChange={(e) => handleChange(e.target.value)}
        >
          {tilesets.map((tileset) => {
            const incompatible = gridSize !== undefined && (
              tileset.tile_width !== gridSize.width ||
              tileset.tile_height !== gridSize.height
            );

            return (
              <MenuItem key={tileset.id} value={tileset.id} disabled={incompatible}>
                {tileset.name}
                {incompatible ? ' (incompatible grid)' : ''}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </Box>
  );
};
