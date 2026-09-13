'use client';

import { Box, Chip, Typography } from '@mui/material';
import type { Tileset } from '@packages/types';
import { resolveTilesetOrigin } from '@/lib/tilesetOrigin';
import { AssetUsageSection } from './AssetUsageSection';

interface TilesetInspectorProps {
  projectId: string;
  tileset: Tileset;
}

export const TilesetInspector = ({ projectId, tileset }: TilesetInspectorProps) => {
  const origin = resolveTilesetOrigin(tileset.id);

  return (
    <Box
      data-testid="tileset-inspector"
      sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: '#161616' }}
    >
      <Typography variant="overline" sx={{ color: '#777', fontWeight: 700 }}>
        Tileset
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', flexGrow: 1 }}>
          {tileset.name}
        </Typography>
        <Chip
          label={origin === 'registry' ? 'Built-in' : 'Project'}
          size="small"
          color={origin === 'registry' ? 'info' : 'default'}
          data-testid="tileset-origin"
        />
      </Box>

      <Box
        component="img"
        src={tileset.image_source}
        alt={tileset.name}
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

      <Typography variant="body2" sx={{ color: '#aaa', mt: 1.5 }}>
        Tile size: {tileset.tile_width} × {tileset.tile_height} px
      </Typography>

      <AssetUsageSection
        projectId={projectId}
        kind="tileset"
        assetId={tileset.id}
        assetName={tileset.name}
        canDelete={origin === 'project'}
      />
    </Box>
  );
};
