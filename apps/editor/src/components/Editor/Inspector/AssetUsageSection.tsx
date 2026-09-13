'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import type {
  AssetKind,
  AssetUsage,
  AssetUsageResponse,
  Map,
} from '@packages/types';
import { apiFetch } from '@/lib/apiFetch';
import { selectMap } from '@/lib/mapSelection';
import { useToast } from '@/context/ToastContext';
import { useEntitySelectionStore } from '@/stores/entitySelectionStore';
import { useProjectExplorerStore } from '@/stores/projectExplorerStore';
import { useSelectionStore } from '@/stores/selectionStore';

export const ASSET_DELETE_REQUEST_EVENT = 'rpgstudio:asset-delete-request';
export const ASSET_DELETED_EVENT = 'rpgstudio:asset-deleted';

interface AssetUsageSectionProps {
  projectId: string;
  kind: AssetKind;
  assetId: string;
  assetName: string;
  canDelete: boolean;
}

interface AssetDeleteEventDetail {
  kind: AssetKind;
  assetId: string;
}

const usageLabel = (usage: AssetUsage): string => {
  switch (usage.type) {
    case 'map':
      return 'Map';
    case 'entity':
      return 'Entity';
    case 'character':
      return 'Character';
    default: {
      const exhaustive: never = usage.type;
      return exhaustive;
    }
  }
};

export const AssetUsageSection = ({
  projectId,
  kind,
  assetId,
  assetName,
  canDelete,
}: AssetUsageSectionProps) => {
  const [usageResponse, setUsageResponse] = useState<AssetUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(
        `/api/projects/${projectId}/assets/${kind}/${assetId}/usage`,
      );
      if (!response.ok) {
        throw new Error('Failed to load asset usages');
      }
      setUsageResponse(await response.json() as AssetUsageResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load asset usages');
    } finally {
      setLoading(false);
    }
  }, [assetId, kind, projectId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUsage();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadUsage]);

  useEffect(() => {
    const handleDeleteRequest = (event: Event) => {
      const detail = (event as CustomEvent<AssetDeleteEventDetail>).detail;
      if (detail?.kind === kind && detail.assetId === assetId && canDelete) {
        setConfirmOpen(true);
      }
    };
    window.addEventListener(ASSET_DELETE_REQUEST_EVENT, handleDeleteRequest);
    return () => window.removeEventListener(ASSET_DELETE_REQUEST_EVENT, handleDeleteRequest);
  }, [assetId, canDelete, kind]);

  const followUsage = async (usage: AssetUsage) => {
    if (usage.type === 'character') return;

    const mapId = usage.type === 'map' ? usage.id : usage.mapId;
    if (!mapId) return;

    try {
      const response = await apiFetch(`/api/projects/${projectId}/maps`);
      if (!response.ok) throw new Error('Failed to load maps');
      const maps = await response.json() as Map[];
      const map = maps.find((candidate) => candidate.id === mapId);
      if (!map) throw new Error('Referenced map is unavailable');

      selectMap(map);
      if (usage.type === 'entity') {
        useProjectExplorerStore.getState().setSelectedItem(usage.id, 'entity');
        useSelectionStore.getState().setSelection('entity', usage.id, usage);
        useEntitySelectionStore.getState().setSelectedEntity(usage.id);
      }
    } catch (navigationError) {
      showToast(
        navigationError instanceof Error ? navigationError.message : 'Failed to open usage',
        'error',
      );
    }
  };

  const deleteAsset = async () => {
    setDeleting(true);
    try {
      const resource = kind === 'tileset' ? 'tilesets' : 'sprites';
      const response = await apiFetch(
        `/api/projects/${projectId}/${resource}/${assetId}`,
        { method: 'DELETE' },
      );

      if (response.status === 409) {
        const conflict = await response.json() as AssetUsageResponse & { message?: string };
        setUsageResponse(conflict);
        setConfirmOpen(false);
        showToast(conflict.message ?? 'Asset is still in use', 'error');
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? 'Failed to delete asset');
      }

      window.dispatchEvent(new CustomEvent(ASSET_DELETED_EVENT, {
        detail: { kind, assetId },
      }));
      useSelectionStore.getState().clearSelection();
      useProjectExplorerStore.getState().setSelectedItem(null, null);
      showToast(`Deleted "${assetName}"`, 'success');
      setConfirmOpen(false);
    } catch (deleteError) {
      showToast(
        deleteError instanceof Error ? deleteError.message : 'Failed to delete asset',
        'error',
      );
    } finally {
      setDeleting(false);
    }
  };

  const usages = usageResponse?.usages ?? [];

  return (
    <>
      <Divider sx={{ my: 2, borderColor: '#333' }} />
      <Typography variant="overline" sx={{ color: '#777', fontWeight: 700 }}>
        Used by
      </Typography>

      {loading && <CircularProgress size={18} sx={{ mt: 1 }} />}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {!loading && !error && usages.length === 0 && (
        <Alert severity="success" data-testid="asset-unused" sx={{ mt: 1 }}>
          Unused
        </Alert>
      )}
      {!loading && usages.length > 0 && (
        <List dense disablePadding data-testid="asset-usages">
          {usages.map((usage) => (
            <ListItemButton
              key={`${usage.type}-${usage.mapId ?? ''}-${usage.id}`}
              disabled={usage.type === 'character'}
              onClick={() => void followUsage(usage)}
              sx={{ px: 0, borderBottom: '1px solid #292929' }}
            >
              <ListItemText
                primary={usage.name}
                secondary={usageLabel(usage)}
                slotProps={{
                  primary: { sx: { fontSize: '0.8rem' } },
                  secondary: { sx: { fontSize: '0.68rem' } },
                }}
              />
            </ListItemButton>
          ))}
        </List>
      )}

      {canDelete && (
        <Button
          color="error"
          variant="outlined"
          fullWidth
          sx={{ mt: 2 }}
          onClick={() => setConfirmOpen(true)}
          data-testid="delete-asset"
        >
          Delete asset
        </Button>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete asset?</DialogTitle>
        <DialogContent>
          <Box>
            <Typography>
              Delete <strong>{assetName}</strong>? This action cannot be undone.
            </Typography>
            {usages.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This asset is still used in {usages.length} place{usages.length === 1 ? '' : 's'}
                {' '}and cannot be deleted.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting || usages.length > 0}
            onClick={() => void deleteAsset()}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
