'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Stack,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { Map as MapIcon, Add, Delete } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import { useProjectExplorerStore } from '@/stores/projectExplorerStore';
import { useToast } from '@/context/ToastContext';
import { apiFetch } from '@/lib/apiFetch';
import { clearMapSelection, selectMap } from '@/lib/mapSelection';
import type { Map, Tileset } from '@packages/types';

const darkFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    '& fieldset': { borderColor: '#444' },
    '&:hover fieldset': { borderColor: '#666' },
    '&.Mui-focused fieldset': { borderColor: '#2196F3' },
  },
  '& .MuiInputLabel-root': { color: '#aaa' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#2196F3' },
  '& .MuiSelect-icon': { color: '#aaa' },
  '& input[type=number]': { color: '#fff' },
};

// ---------------------------------------------------------------------------
// CreateMapDialog
// ---------------------------------------------------------------------------
interface CreateMapDialogProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onCreated: (map: Map) => void;
}

function CreateMapDialog({ open, projectId, onClose, onCreated }: CreateMapDialogProps) {
  const [name, setName] = useState('');
  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(15);
  const [tilesetId, setTilesetId] = useState('');
  const [tilesets, setTilesets] = useState<Tileset[]>([]);
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  // Fetch available tilesets for the picker
  useEffect(() => {
    if (!open || !projectId) return;
    apiFetch(`/api/tilesets?projectId=${projectId}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Tileset[]) => {
        setTilesets(data);
        if (data.length > 0) setTilesetId(data[0].id);
      })
      .catch(() => {});
  }, [open, projectId]);

  const handleClose = () => {
    setName('');
    setWidth(20);
    setHeight(15);
    setTilesetId('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Map name is required', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), width, height, tilesetId: tilesetId || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || 'Failed to create map');
      }
      const created: Map = await res.json();
      showToast(`Map "${created.name}" created`, 'success');
      onCreated(created);
      handleClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create map', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: {
            bgcolor: '#1e1e1e',
            color: '#fff',
            border: '1px solid #333',
            minWidth: 360,
          },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #333', fontSize: '1rem', fontWeight: 600 }}>
          New Map
        </DialogTitle>

        <DialogContent sx={{ pt: 2, pb: 1, display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Name */}
          <TextField
            autoFocus
            label="Map name"
            value={name}
            onChange={e => setName(e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. World Map"
            sx={darkFieldSx}
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
              sx={darkFieldSx}
            />
            <TextField
              label="Height (tiles)"
              type="number"
              value={height}
              onChange={e => setHeight(Math.max(1, parseInt(e.target.value) || 1))}
              size="small"
              fullWidth
              slotProps={{ htmlInput: { min: 1, max: 500 } }}
              sx={darkFieldSx}
            />
          </Stack>

          {/* Tile count info */}
          <Typography variant="caption" sx={{ color: '#666', mt: -1 }}>
            {width * height} tiles total · {width * 32}×{height * 32} px at 32 px/tile
          </Typography>

          {/* Tileset picker */}
          <FormControl size="small" fullWidth sx={darkFieldSx}>
            <InputLabel>Starting tileset</InputLabel>
            <Select
              value={tilesetId}
              onChange={e => setTilesetId(e.target.value)}
              label="Starting tileset"
            >
              <MenuItem value="">
                <em style={{ color: '#666' }}>None (add later)</em>
              </MenuItem>
              {tilesets.map(ts => (
                <MenuItem key={ts.id} value={ts.id} sx={{ color: '#fff' }}>
                  {ts.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 2, borderTop: '1px solid #333', mt: 1, gap: 1 }}>
          <Button onClick={handleClose} sx={{ color: '#888' }} disabled={creating}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={creating || !name.trim()}
            sx={{ bgcolor: '#2196F3', '&:hover': { bgcolor: '#1976D2' }, minWidth: 80 }}
          >
            {creating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// MapsTree
// ---------------------------------------------------------------------------
export const MapsTree = () => {
  const params = useParams();
  const projectId = params?.projectId as string;

  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Deletion state
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    map: Map;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [mapToDelete, setMapToDelete] = useState<Map | null>(null);

  const selectedItemId = useProjectExplorerStore((state) => state.selectedItemId);
  const { showToast } = useToast();

  const fetchMaps = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const response = await apiFetch(`/api/projects/${projectId}/maps`);
      if (!response.ok) throw new Error('Failed to fetch maps');
      setMaps(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => { fetchMaps(); }, [fetchMaps]);

  // Listen for external deletions (e.g. from Inspector) to keep list in sync
  useEffect(() => {
    const handleMapDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ mapId: string }>;
      const deletedId = customEvent.detail?.mapId;
      if (!deletedId) return;

      setMaps(prev => prev.filter(m => m.id !== deletedId));

      if (selectedItemId === deletedId) {
        clearMapSelection();
      }
    };

    window.addEventListener('rpgstudio:map-deleted', handleMapDeleted as EventListener);
    return () => {
      window.removeEventListener('rpgstudio:map-deleted', handleMapDeleted as EventListener);
    };
  }, [selectedItemId]);

  const handleMapCreated = (map: Map) => {
    setMaps(prev => [...prev, map]);
    // Auto-select so the canvas, inspector and palette switch to the new map
    selectMap(map);
  };

  // ---- Deletion Handlers ----
  const handleContextMenu = (event: React.MouseEvent, map: Map) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      map,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleDeleteClick = () => {
    if (contextMenu) {
      setMapToDelete(contextMenu.map);
      setDeleteConfirmOpen(true);
      handleCloseContextMenu();
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setMapToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!mapToDelete) return;

    try {
      const response = await apiFetch(`/api/projects/${projectId}/maps/${mapToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete map');
      }

      setMaps(prev => prev.filter(m => m.id !== mapToDelete.id));
      
      // If deleted map was selected, clear selection
      if (selectedItemId === mapToDelete.id) {
        clearMapSelection();
      }
      
      showToast(`Deleted map "${mapToDelete.name}"`, 'success');
    } catch (error) {
      console.error('Error deleting map:', error);
      showToast('Failed to delete map', 'error');
    } finally {
      setDeleteConfirmOpen(false);
      setMapToDelete(null);
    }
  };

  // ---- Shared header label with Add button ----
  const mapsHeaderLabel = (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <span>📁</span>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>Maps</Typography>
        {!loading && (
          <Typography variant="caption" sx={{ color: '#555', ml: 0.5 }}>({maps.length})</Typography>
        )}
      </Box>

      <Tooltip title="New map" placement="right">
        <IconButton
          size="small"
          onClick={e => { e.stopPropagation(); setDialogOpen(true); }}
          sx={{ p: 0.5 }}
          aria-label="Create new map"
        >
          <Add sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading maps...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ py: 1 }}>Error: {error}</Typography>
    );
  }

  return (
    <>
      <SimpleTreeView
        defaultExpandedItems={['maps-root']}
        selectedItems={selectedItemId || ''}
        sx={{ flexGrow: 1, overflowY: 'auto' }}
      >
        <TreeItem itemId="maps-root" label={mapsHeaderLabel}>
          {maps.length === 0 ? (
            <TreeItem
              itemId="maps-empty"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: '#555', fontSize: '0.75rem', fontStyle: 'italic' }}>
                    No maps yet —
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#2196F3',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                    onClick={e => { e.stopPropagation(); setDialogOpen(true); }}
                  >
                    create one
                  </Typography>
                </Box>
              }
            />
          ) : (
            maps.map((map) => (
              <TreeItem
                key={map.id}
                itemId={map.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MapIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{map.name}</Typography>
                    <Typography variant="caption" sx={{ color: '#555', ml: 'auto', fontSize: '0.65rem' }}>
                      {map.width}×{map.height}
                    </Typography>
                    <Tooltip title="Delete map">
                      <IconButton
                        size="small"
                        sx={{ ml: 0.5, p: 0.25 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMapToDelete(map);
                          setDeleteConfirmOpen(true);
                        }}
                        aria-label={`Delete map ${map.name}`}
                      >
                        <span role="img" aria-hidden="true">🗑️</span>
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                onClick={() => selectMap(map)}
                onContextMenu={(e) => handleContextMenu(e, map)}
              />
            ))
          )}
        </TreeItem>
      </SimpleTreeView>

      <CreateMapDialog
        open={dialogOpen}
        projectId={projectId}
        onClose={() => setDialogOpen(false)}
        onCreated={handleMapCreated}
      />

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Map</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Map?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{mapToDelete?.name}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
