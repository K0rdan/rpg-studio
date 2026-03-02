'use client';

import { Box, Typography, TextField, Divider } from '@mui/material';
import type { PlayerProperties } from '@packages/types';

interface PlayerPropertiesPanelProps {
  playerProperties: PlayerProperties;
  onChange: (updated: PlayerProperties) => void;
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    '& fieldset': { borderColor: '#444' },
    '&:hover fieldset': { borderColor: '#666' },
    '&.Mui-focused fieldset': { borderColor: '#2196F3' },
  },
  '& .MuiInputLabel-root': { color: '#aaa' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#2196F3' },
};

export const PlayerPropertiesPanel = ({ playerProperties, onChange }: PlayerPropertiesPanelProps) => {
  const handleChange = (field: keyof PlayerProperties, raw: string) => {
    const value = parseFloat(raw);
    if (!isNaN(value)) {
      onChange({ ...playerProperties, [field]: value });
    }
  };

  return (
    <Box>
      <Divider sx={{ my: 2, borderColor: '#444' }} />

      <Typography
        variant="overline"
        sx={{ color: '#2196F3', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.1em', px: 0.5 }}
      >
        Player Properties
      </Typography>

      {/* Speed */}
      <TextField
        label="Speed (tiles/sec)"
        type="number"
        value={playerProperties.speed}
        onChange={(e) => handleChange('speed', e.target.value)}
        fullWidth
        margin="normal"
        inputProps={{ min: 0.5, max: 20, step: 0.5 }}
        helperText="How many tiles the player moves per second"
        sx={fieldSx}
        FormHelperTextProps={{ sx: { color: '#777' } }}
      />

      {/* Health */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          label="Health"
          type="number"
          value={playerProperties.health}
          onChange={(e) => handleChange('health', e.target.value)}
          fullWidth
          margin="normal"
          inputProps={{ min: 1, max: 9999, step: 1 }}
          sx={fieldSx}
        />
        <TextField
          label="Max Health"
          type="number"
          value={playerProperties.maxHealth}
          onChange={(e) => handleChange('maxHealth', e.target.value)}
          fullWidth
          margin="normal"
          inputProps={{ min: 1, max: 9999, step: 1 }}
          sx={fieldSx}
        />
      </Box>
    </Box>
  );
};
