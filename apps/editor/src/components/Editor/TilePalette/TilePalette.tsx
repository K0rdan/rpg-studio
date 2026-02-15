'use client';

import { Box, CircularProgress, Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { TileGrid } from './TileGrid';
import type { Tileset } from '@packages/types';

interface TilePaletteProps {
  tilesetId: string;
}

export const TilePalette = ({ tilesetId }: TilePaletteProps) => {
  const params = useParams();
  const projectId = params?.projectId as string;

  const [tileset, setTileset] = useState<Tileset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch single tileset
  useEffect(() => {
    if (!tilesetId || !projectId) return;

    const fetchTileset = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/projects/${projectId}/tilesets/${tilesetId}`);
        if (!response.ok) throw new Error('Failed to fetch tileset');

        const data = await response.json();
        setTileset(data);
      } catch (err) {
        console.error('Error fetching tileset:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tileset');
      } finally {
        setLoading(false);
      }
    };

    fetchTileset();
  }, [tilesetId, projectId]);

  if (loading) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2,
        }}
      >
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      id="tile-palette"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Tile Palette
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {tileset?.name || 'Unknown Tileset'}
        </Typography>
      </Box>

      {/* Tile Grid */}
      <TileGrid tileset={tileset} />
    </Box>
  );
};
