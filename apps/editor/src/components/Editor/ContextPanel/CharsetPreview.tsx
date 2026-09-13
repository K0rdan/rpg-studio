'use client';

import { Alert, Box, Typography } from '@mui/material';
import type { Sprite } from '@packages/types';

interface CharsetPreviewProps {
  sprite: Sprite;
}

export const CharsetPreview = ({ sprite }: CharsetPreviewProps) => {
  if (!sprite.image_source) {
    return (
      <Box sx={{ p: 2 }} data-testid="charset-preview">
        <Typography variant="h6">{sprite.name}</Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>Image unavailable</Alert>
      </Box>
    );
  }

  return (
    <Box
      data-testid="charset-preview"
      sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: '#161616' }}
    >
      <Typography variant="overline" sx={{ color: '#777', fontWeight: 700 }}>
        Charset preview
      </Typography>
      <Typography variant="h6" sx={{ fontSize: '1rem' }}>{sprite.name}</Typography>

      <Box
        component="img"
        src={sprite.image_source}
        alt={`${sprite.name} spritesheet`}
        sx={{
          display: 'block',
          width: '100%',
          maxHeight: 360,
          objectFit: 'contain',
          imageRendering: 'pixelated',
          bgcolor: '#0d0d0d',
          border: '1px solid #333',
          borderRadius: 1,
          mt: 2,
        }}
      />

      <Typography variant="caption" sx={{ display: 'block', color: '#777', mt: 2, mb: 0.5 }}>
        Idle frame
      </Typography>
      <Box
        sx={{
          width: sprite.frame_width,
          height: sprite.frame_height,
          maxWidth: '100%',
          overflow: 'hidden',
          position: 'relative',
          bgcolor: '#0d0d0d',
          border: '1px solid #333',
        }}
      >
        <Box
          component="img"
          src={sprite.image_source}
          alt={`${sprite.name} idle frame`}
          sx={{
            position: 'absolute',
            width: 'auto',
            height: 'auto',
            maxWidth: 'none',
            imageRendering: 'pixelated',
            transform: `translateX(-${sprite.frame_width}px)`,
          }}
        />
      </Box>

      <Typography variant="caption" sx={{ display: 'block', color: '#777', mt: 1 }}>
        {sprite.frame_width} × {sprite.frame_height} px per frame
      </Typography>
    </Box>
  );
};
