import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { useTileSelectionStore } from '@/stores/tileSelectionStore';
import type { Tileset } from '@packages/types';

interface TilesetSelectorProps {
  tilesets: Tileset[];
  loading?: boolean;
}

export const TilesetSelector = ({ tilesets, loading = false }: TilesetSelectorProps) => {
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
          {tilesets.map((tileset) => (
            <MenuItem key={tileset.id} value={tileset.id}>
              {tileset.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
