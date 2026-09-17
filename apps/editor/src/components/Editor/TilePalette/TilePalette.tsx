'use client';

import { Box, CircularProgress, FormControlLabel, Switch, Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TileGrid } from './TileGrid';
import { TilesetSelector } from './TilesetSelector';
import { CollisionHitboxControls } from './CollisionHitboxControls';
import { apiFetch } from '@/lib/apiFetch';
import { ASSET_DELETED_EVENT, readAssetDeleteEventDetail } from '@/lib/assetEvents';
import { useEditorStore } from '@/stores/editorStore';
import { useMapStore } from '@/stores/mapStore';
import { useTileSelectionStore } from '@/stores/tileSelectionStore';
import { resolveMapTileset } from '@packages/core';
import type { Tileset } from '@packages/types';

interface TilePaletteProps {
  tilesetId?: string;
}

export const TilePalette = ({ tilesetId }: TilePaletteProps) => {
  const params = useParams();
  const projectId = params?.projectId as string;

  // Without an explicit tileset, show the one the map canvas actually renders with.
  const activeTilesetId = useTileSelectionStore((state) => state.selectedTilesetId);
  const setSelectedTileset = useTileSelectionStore((state) => state.setSelectedTileset);
  const clearTileSelection = useTileSelectionStore((state) => state.clearSelection);
  const effectiveTilesetId = activeTilesetId ?? tilesetId ?? undefined;

  const tileset = useEditorStore((state) => state.tileset.current);
  const isTilesetDirty = useEditorStore((state) => state.tileset.isDirty);
  const setCurrentTileset = useEditorStore((state) => state.setCurrentTileset);
  const setTileCollidable = useEditorStore((state) => state.setTileCollidable);
  const setTileCollisionRect = useEditorStore((state) => state.setTileCollisionRect);
  const selectedTileIndex = useTileSelectionStore((state) => state.selectedTileIndex);
  const currentMap = useMapStore((state) => state.currentMap);
  const [tilesets, setTilesets] = useState<Tileset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tileset (specific one or first available)
  useEffect(() => {
    if (!projectId) return;

    const fetchTileset = async () => {
      try {
        setLoading(true);
        setError(null);

        const listResponse = await apiFetch(`/api/tilesets?projectId=${projectId}`);
        if (!listResponse.ok) throw new Error('Failed to fetch tilesets');
        const availableTilesets: Tileset[] = await listResponse.json();
        setTilesets(availableTilesets);

        if (effectiveTilesetId) {
          // Fetch specific tileset
          const response = await apiFetch(`/api/projects/${projectId}/tilesets/${effectiveTilesetId}`);
          if (!response.ok) throw new Error('Failed to fetch tileset');
          const data: Tileset = await response.json();
          setCurrentTileset(data);
        } else {
          // Fetch first available tileset
          if (availableTilesets.length > 0) {
            setCurrentTileset(availableTilesets[0]);
            setSelectedTileset(availableTilesets[0].id);
          } else {
            setError('No tilesets available');
          }
        }
      } catch (err) {
        console.error('Error fetching tileset:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tileset');
      } finally {
        setLoading(false);
      }
    };

    fetchTileset();
  }, [effectiveTilesetId, projectId, setCurrentTileset, setSelectedTileset]);

  useEffect(() => {
    if (tilesetId) {
      setSelectedTileset(tilesetId);
    }
  }, [tilesetId, setSelectedTileset]);

  useEffect(() => {
    const handleAssetDeleted = (event: Event) => {
      const detail = readAssetDeleteEventDetail(event);
      if (detail?.kind !== 'tileset') return;

      setTilesets((current) => current.filter((candidate) => candidate.id !== detail.assetId));

      // Dropping the stale selection lets the fetch effect fall back to the first
      // remaining tileset (or report that none is left).
      if (detail.assetId === effectiveTilesetId) {
        clearTileSelection();
        setCurrentTileset(null);
      }
    };

    window.addEventListener(ASSET_DELETED_EVENT, handleAssetDeleted);
    return () => window.removeEventListener(ASSET_DELETED_EVENT, handleAssetDeleted);
  }, [clearTileSelection, effectiveTilesetId, setCurrentTileset]);

  const selectedTileIsCollidable = selectedTileIndex !== null
    && tileset?.tiles?.some(
      (tile) => tile.id === selectedTileIndex && tile.is_collidable === true,
    ) === true;
  const defaultTileset = currentMap ? resolveMapTileset(currentMap, tilesets) : null;

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
      <TilesetSelector
        tilesets={tilesets}
        loading={loading}
        gridSize={defaultTileset ? {
          width: defaultTileset.tile_width,
          height: defaultTileset.tile_height,
        } : undefined}
      />

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
          {isTilesetDirty ? ' • Unsaved' : ''}
        </Typography>
        <FormControlLabel
          sx={{ ml: 1 }}
          control={
            <Switch
              size="small"
              checked={selectedTileIsCollidable}
              disabled={selectedTileIndex === null || !tileset}
              onChange={(_, checked) => {
                if (selectedTileIndex !== null) {
                  setTileCollidable(selectedTileIndex, checked);
                }
              }}
              slotProps={{ input: { 'aria-label': 'Blocking' } }}
            />
          }
          label="Blocking"
        />
        {/* Kept mounted (inert when the tile does not block) so switching tiles
            never resizes the header and shifts the grid below. */}
        {tileset ? (
          <CollisionHitboxControls
            tileset={tileset}
            tileId={selectedTileIsCollidable ? selectedTileIndex : null}
            onChange={(rect) => {
              if (selectedTileIndex !== null) {
                setTileCollisionRect(selectedTileIndex, rect);
              }
            }}
          />
        ) : null}
      </Box>

      {/* Tile Grid */}
      <TileGrid tileset={tileset} />
    </Box>
  );
};
