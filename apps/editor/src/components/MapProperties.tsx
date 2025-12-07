'use client';

import { Map, Tileset } from '@packages/types';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

interface MapPropertiesProps {
  mapData: Map;
  tilesets: Tileset[];
  onChange: (field: keyof Map, value: any) => void;
}

export default function MapProperties({ mapData, tilesets, onChange }: MapPropertiesProps) {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Map Properties</Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Width"
          type="number"
          value={mapData.width}
          onChange={(e) => onChange('width', Number(e.target.value))}
          inputProps={{ min: 1 }}
          sx={{ width: 100 }}
        />
        <TextField
          label="Height"
          type="number"
          value={mapData.height}
          onChange={(e) => onChange('height', Number(e.target.value))}
          inputProps={{ min: 1 }}
          sx={{ width: 100 }}
        />
        <TextField
          select
          label="Tileset"
          value={mapData.tilesetId || ''}
          onChange={(e) => onChange('tilesetId', e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {tilesets.map((ts) => (
            <MenuItem key={ts.id} value={ts.id}>
              {ts.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </Paper>
  );
}
