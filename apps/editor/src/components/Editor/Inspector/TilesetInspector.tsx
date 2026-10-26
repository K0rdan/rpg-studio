'use client';

import { Box, Chip, Typography } from '@mui/material';
import type { Tileset } from '@packages/types';
import { resolveTilesetOrigin } from '@/lib/tilesetOrigin';
import { AssetUsageSection } from './AssetUsageSection';

interface TilesetInspectorProps {
  projectId: string;
  tileset: Tileset;
}

const formatMetadataValue = (value: string) => value
  .replace(/[-_]/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatGenerationDate = (value: Date) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
};

interface MetadataRowProps {
  label: string;
  value: string;
}

const MetadataRow = ({ label, value }: MetadataRowProps) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(88px, 0.45fr) minmax(0, 1fr)', gap: 1, py: 0.5 }}>
    <Typography variant="caption" sx={{ color: '#777' }}>{label}</Typography>
    <Typography variant="body2" sx={{ color: '#ccc', fontSize: '0.75rem', overflowWrap: 'anywhere' }}>
      {value}
    </Typography>
  </Box>
);

export const TilesetInspector = ({ projectId, tileset }: TilesetInspectorProps) => {
  const origin = resolveTilesetOrigin(tileset.id);
  const metadata = tileset.generation_metadata;

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

      {metadata && (
        <Box data-testid="tileset-generation-metadata" sx={{ mt: 2 }}>
          <Typography variant="overline" sx={{ color: '#777', fontWeight: 700 }}>
            Generation metadata
          </Typography>
          <Box sx={{ mt: 0.25, borderTop: '1px solid #333', borderBottom: '1px solid #333', py: 0.5 }}>
            <MetadataRow label="Generated" value={metadata.generated ? 'Yes' : 'No'} />
            {metadata.role && <MetadataRow label="Role" value={formatMetadataValue(metadata.role)} />}
            {metadata.category && <MetadataRow label="Category" value={formatMetadataValue(metadata.category)} />}
            {metadata.generationDescription && (
              <MetadataRow label="Description" value={metadata.generationDescription} />
            )}
            {!metadata.generationDescription && metadata.label && (
              <MetadataRow label="Description" value={metadata.label} />
            )}
            {metadata.style && <MetadataRow label="Style" value={formatMetadataValue(metadata.style)} />}
            {metadata.model && <MetadataRow label="Model" value={formatMetadataValue(metadata.model)} />}
            {metadata.generationMode && (
              <MetadataRow label="Mode" value={formatMetadataValue(metadata.generationMode)} />
            )}
            {metadata.tilingMode && (
              <MetadataRow label="Tiling" value={formatMetadataValue(metadata.tilingMode)} />
            )}
            {metadata.generated_at && (
              <MetadataRow label="Generated at" value={formatGenerationDate(metadata.generated_at)} />
            )}
            {metadata.sourceFamilyIds?.length ? (
              <MetadataRow label="Source families" value={metadata.sourceFamilyIds.join(', ')} />
            ) : null}
            {metadata.pairFamilyIds?.length ? (
              <MetadataRow label="Transition families" value={metadata.pairFamilyIds.join(', ')} />
            ) : null}
            {metadata.status && <MetadataRow label="Status" value={formatMetadataValue(metadata.status)} />}
            {metadata.prompt && <MetadataRow label="Prompt" value={metadata.prompt} />}
          </Box>
        </Box>
      )}

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
