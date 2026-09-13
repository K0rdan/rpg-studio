'use client';

import { Alert, Box, Typography } from '@mui/material';
import type { Sprite } from '@packages/types';
import { AssetUsageSection } from './AssetUsageSection';

interface CharsetInspectorProps {
  projectId: string;
  sprite: Sprite;
}

export const CharsetInspector = ({ projectId, sprite }: CharsetInspectorProps) => {
  const unavailable = !sprite.image_source;

  return (
    <Box
      data-testid="charset-inspector"
      sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: '#161616' }}
    >
      <Typography variant="overline" sx={{ color: '#777', fontWeight: 700 }}>
        Charset
      </Typography>
      <Typography variant="h6" sx={{ fontSize: '1rem', mt: 0.5 }}>
        {sprite.name}
      </Typography>

      {unavailable ? (
        <Alert severity="warning" data-testid="charset-unavailable" sx={{ mt: 2 }}>
          Image unavailable
        </Alert>
      ) : (
        <Box
          component="img"
          src={sprite.image_source}
          alt={sprite.name}
          sx={{
            display: 'block',
            width: '100%',
            maxHeight: 220,
            objectFit: 'contain',
            imageRendering: 'pixelated',
            bgcolor: '#0d0d0d',
            border: '1px solid #333',
            borderRadius: 1,
            mt: 2,
          }}
        />
      )}

      <Typography variant="body2" sx={{ color: '#aaa', mt: 1.5 }}>
        Frame size: {sprite.frame_width} × {sprite.frame_height} px
      </Typography>

      <AssetUsageSection
        projectId={projectId}
        kind="charset"
        assetId={sprite.id}
        assetName={sprite.name}
        canDelete
      />
    </Box>
  );
};
