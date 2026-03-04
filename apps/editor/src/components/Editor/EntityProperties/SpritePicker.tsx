'use client';

import { Box, Typography, FormControl, Select, MenuItem, InputLabel, CircularProgress } from '@mui/material';
import type { Sprite } from '@packages/types';

interface SpritPickerProps {
  sprites: Sprite[];
  isLoading: boolean;
  currentSpriteId?: string;
  onChange: (spriteId: string | undefined) => void;
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
  '& .MuiSelect-icon': { color: '#aaa' },
};

export const SpritePicker = ({ sprites, isLoading, currentSpriteId, onChange }: SpritPickerProps) => {
  return (
    <Box sx={{ mt: 1 }}>
      <Typography
        variant="overline"
        sx={{ color: '#9C27B0', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.1em', px: 0.5 }}
      >
        Sprite
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <CircularProgress size={14} />
          <Typography variant="caption" sx={{ color: '#888' }}>Loading sprites…</Typography>
        </Box>
      ) : (
        <FormControl fullWidth margin="dense" sx={fieldSx}>
          <InputLabel>Sprite</InputLabel>
          <Select
            value={currentSpriteId ?? ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            label="Sprite"
            renderValue={(selected) => {
              if (!selected) return <span style={{ color: '#666' }}>No sprite attached</span>;
              const sprite = sprites.find((s) => s.id === selected);
              return sprite ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {sprite.image_source && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sprite.image_source}
                      alt={sprite.name}
                      style={{ width: 20, height: 20, objectFit: 'contain', imageRendering: 'pixelated' }}
                    />
                  )}
                  {sprite.name}
                </Box>
              ) : selected;
            }}
          >
            <MenuItem value="">
              <em style={{ color: '#888' }}>None</em>
            </MenuItem>
            {sprites.map((sprite) => (
              <MenuItem key={sprite.id} value={sprite.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {sprite.image_source && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sprite.image_source}
                      alt={sprite.name}
                      style={{ width: 24, height: 24, objectFit: 'contain', imageRendering: 'pixelated', border: '1px solid #444' }}
                    />
                  )}
                  <Box>
                    <Typography variant="body2">{sprite.name}</Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      {sprite.frame_width}×{sprite.frame_height} px/frame
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
};
