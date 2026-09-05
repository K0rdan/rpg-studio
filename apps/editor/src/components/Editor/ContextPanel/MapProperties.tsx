'use client';

import { Box, Typography, TextField, Divider, Button, Select, MenuItem, FormControl, InputLabel, CircularProgress, Stack, Chip } from '@mui/material';
import { Delete, Save } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { useSelectionStore } from '@/stores/selectionStore';
import { useProjectExplorerStore } from '@/stores/projectExplorerStore';
import { useMapStore } from '@/stores/mapStore';
import type { Map, Tileset } from '@packages/types';

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
  '& input': { color: '#fff' },
};

interface MapPropertiesProps {
  mapId: string;
}

export const MapProperties = ({ mapId }: MapPropertiesProps) => {
  const params = useParams();
  const projectId = params?.projectId as string;
  const { showToast } = useToast();
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const setSelectedItem = useProjectExplorerStore((state) => state.setSelectedItem);
  const setActiveMapId = useMapStore((state) => state.setActiveMapId);

  const [map, setMap] = useState<Map | null>(null);
  const [tilesets, setTilesets] = useState<Tileset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable form state (kept separate from map so dirty-check works)
  const [name, setName] = useState('');
  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(15);
  const [tilesetId, setTilesetId] = useState('');

  const isDirty =
    map !== null &&
    (name !== map.name || width !== map.width || height !== map.height || tilesetId !== (map.tilesetId ?? ''));

  const fetchMap = useCallback(async () => {
    if (!mapId || !projectId) return;
    try {
      setLoading(true);
      const [mapRes, tilesetsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/maps/${mapId}`),
        fetch(`/api/tilesets?projectId=${projectId}`),
      ]);
      if (!mapRes.ok) throw new Error('Failed to fetch map');
      const data: Map = await mapRes.json();
      const tsData: Tileset[] = tilesetsRes.ok ? await tilesetsRes.json() : [];
      setMap(data);
      setTilesets(tsData);
      setName(data.name);
      setWidth(data.width);
      setHeight(data.height);
      setTilesetId(data.tilesetId ?? '');
    } catch (error) {
      console.error('Error fetching map:', error);
      showToast('Failed to load map properties', 'error');
    } finally {
      setLoading(false);
    }
  }, [mapId, projectId, showToast]);

  useEffect(() => { fetchMap(); }, [fetchMap]);

  const handleSave = async () => {
    if (!map || !projectId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/maps/${mapId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, width, height, tilesetId: tilesetId || undefined }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated: Map = await res.json();
      setMap(updated);
      showToast('Map saved', 'success');
    } catch {
      showToast('Failed to save map', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!map || !projectId || deleting) return;

    // Lightweight confirmation to avoid accidental deletion from inspector
    const confirmed = window.confirm(`Delete map "${map.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/maps/${mapId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete map');
      }

      // Clear editor selection / active map
      clearSelection();
      setSelectedItem(null, null);
      setActiveMapId(null);

      // Notify other components (e.g. MapsTree) so they can update local state
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('rpgstudio:map-deleted', {
            detail: { mapId },
          }),
        );
      }

      showToast(`Deleted map "${map.name}"`, 'success');
    } catch (error) {
      console.error('Error deleting map from inspector:', error);
      showToast('Failed to delete map', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  if (!map) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="error">Failed to load map</Typography>
      </Box>
    );
  }

  const selectedTileset = tilesets.find(ts => ts.id === tilesetId);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto', bgcolor: '#161616' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1, borderBottom: '1px solid #2a2a2a' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="overline" sx={{ color: '#2196F3', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.1em' }}>
              Map Properties
            </Typography>
            <Typography variant="body2" sx={{ color: '#ddd', fontWeight: 600, mt: 0.5 }}>
              {map.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isDirty && (
              <Chip
                label="unsaved"
                size="small"
                sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#3d2600', color: '#FF8C00', border: '1px solid #FF8C00' }}
              />
            )}
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Delete fontSize="small" />}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Fields */}
      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Name */}
        <TextField
          label="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          size="small"
          fullWidth
          sx={fieldSx}
        />

        {/* Size */}
        <Stack direction="row" spacing={1.5}>
          <TextField
            label="Width (tiles)"
            type="number"
            value={width}
            onChange={e => setWidth(Math.max(1, parseInt(e.target.value) || 1))}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { min: 1, max: 500 } }}
            sx={fieldSx}
          />
          <TextField
            label="Height (tiles)"
            type="number"
            value={height}
            onChange={e => setHeight(Math.max(1, parseInt(e.target.value) || 1))}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { min: 1, max: 500 } }}
            sx={fieldSx}
          />
        </Stack>

        <Typography variant="caption" sx={{ color: '#555', mt: -1 }}>
          {width * height} tiles · {width * 32}×{height * 32} px
        </Typography>

        {/* Tileset */}
        <FormControl size="small" fullWidth sx={fieldSx}>
          <InputLabel>Tileset</InputLabel>
          <Select value={tilesetId} onChange={e => setTilesetId(e.target.value)} label="Tileset">
            <MenuItem value=""><em style={{ color: '#666' }}>None</em></MenuItem>
            {tilesets.map(ts => (
              <MenuItem key={ts.id} value={ts.id} sx={{ color: '#fff' }}>{ts.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Tileset preview */}
        {selectedTileset ? (
          <Box
            sx={{
              border: '1px solid #2d2d2d',
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: '#0d0d0d',
            }}
          >
            {/* Thumbnail */}
            <Box
              sx={{
                width: '100%',
                maxHeight: 140,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#111',
                borderBottom: '1px solid #2d2d2d',
                position: 'relative',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedTileset.image_source}
                alt={selectedTileset.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: 140,
                  objectFit: 'contain',
                  imageRendering: 'pixelated',
                  display: 'block',
                }}
              />
            </Box>
            {/* Metadata */}
            <Box sx={{ px: 1.5, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: '#aaa', fontWeight: 500 }}>
                {selectedTileset.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#555' }}>
                {selectedTileset.tile_width}×{selectedTileset.tile_height} px/tile
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              border: '1px dashed #2a2a2a',
              borderRadius: 1,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: '#444', fontStyle: 'italic' }}>
              No tileset — select one above to preview and paint
            </Typography>
          </Box>
        )}

        {/* Readonly info */}
        <Divider sx={{ borderColor: '#2a2a2a' }} />
        <Typography variant="caption" sx={{ color: '#555' }}>
          {map.layers?.length ?? 0} layer{(map.layers?.length ?? 0) !== 1 ? 's' : ''}
        </Typography>

        {/* Save */}
        {isDirty && (
          <Button
            variant="contained"
            size="small"
            startIcon={saving ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <Save fontSize="small" />}
            onClick={handleSave}
            disabled={saving}
            sx={{ bgcolor: '#2196F3', '&:hover': { bgcolor: '#1976D2' }, alignSelf: 'flex-start' }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        )}
      </Box>
    </Box>
  );
};
