'use client';

import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Image as ImageIcon, Warning } from '@mui/icons-material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { useParams } from 'next/navigation';
import type {
  AssetFolderKind,
  AssetFolders,
  AssetUsageResponse,
  Sprite,
  Tileset,
} from '@packages/types';
import TilesetGenerateDialog from '@/components/TilesetGenerateDialog';
import CharsetGenerateDialog from '@/components/CharsetGenerateDialog';
import TilesetUpload from '@/components/TilesetUpload';
import CharsetUploadDialog from '@/components/CharsetUploadDialog';
import { useToast } from '@/context/ToastContext';
import { apiFetch } from '@/lib/apiFetch';
import {
  ASSET_DELETED_EVENT,
  readAssetDeleteEventDetail,
} from '@/lib/assetEvents';
import { normalizeAssetFolderPath } from '@/lib/assetFolders';
import { resolveTilesetOrigin } from '@/lib/tilesetOrigin';
import { useProjectExplorerStore } from '@/stores/projectExplorerStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { AssetContextMenu } from './AssetContextMenu';
import { AssetFolderSection, GenerationStatusBadge } from './AssetFolderSection';

type ContextAsset =
  | { kind: 'tileset'; asset: Tileset }
  | { kind: 'charset'; asset: Sprite };

interface FolderDialogState {
  kind: AssetFolderKind;
  parentPath: string;
}

const EMPTY_FOLDERS: AssetFolders = { tileset: [], charset: [] };

export const AssetsTree = () => {
  const params = useParams();
  const projectId = params?.projectId as string;
  const { showToast } = useToast();
  const [tilesets, setTilesets] = useState<Tileset[]>([]);
  const [sprites, setSprites] = useState<Sprite[]>([]);
  const [folders, setFolders] = useState<AssetFolders>(EMPTY_FOLDERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([
    'assets-root', 'assets-tilesets', 'assets-charsets',
  ]);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    target: ContextAsset;
  } | null>(null);
  const [folderDialog, setFolderDialog] = useState<FolderDialogState | null>(null);
  const [folderName, setFolderName] = useState('');
  const [moveTarget, setMoveTarget] = useState<ContextAsset | null>(null);
  const [movePath, setMovePath] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ContextAsset | null>(null);
  const [deleteUsage, setDeleteUsage] = useState<AssetUsageResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [regenerateTilesetId, setRegenerateTilesetId] = useState<string | null>(null);

  const setSelection = useSelectionStore((state) => state.setSelection);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const selectedItemId = useProjectExplorerStore((state) => state.selectedItemId);
  const setSelectedItem = useProjectExplorerStore((state) => state.setSelectedItem);

  const fetchAssets = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const [tilesetsResponse, spritesResponse, foldersResponse] = await Promise.all([
        apiFetch(`/api/projects/${projectId}/tilesets`),
        apiFetch(`/api/projects/${projectId}/sprites`),
        apiFetch(`/api/projects/${projectId}/asset-folders`),
      ]);
      if (!tilesetsResponse.ok || !spritesResponse.ok || !foldersResponse.ok) {
        throw new Error('Failed to fetch project assets');
      }
      const [nextTilesets, nextSprites, nextFolders] = await Promise.all([
        tilesetsResponse.json() as Promise<Tileset[]>,
        spritesResponse.json() as Promise<Sprite[]>,
        foldersResponse.json() as Promise<AssetFolders>,
      ]);
      setTilesets(nextTilesets);
      setSprites(nextSprites);
      setFolders(nextFolders);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchAssets(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchAssets]);

  useEffect(() => {
    const handleAssetDeleted = (event: Event) => {
      const detail = readAssetDeleteEventDetail(event);
      if (detail?.kind === 'tileset') {
        setTilesets((current) => current.filter((asset) => asset.id !== detail.assetId));
      } else if (detail?.kind === 'charset') {
        setSprites((current) => current.filter((asset) => asset.id !== detail.assetId));
      }
    };
    window.addEventListener(ASSET_DELETED_EVENT, handleAssetDeleted);
    return () => window.removeEventListener(ASSET_DELETED_EVENT, handleAssetDeleted);
  }, []);

  const selectAsset = (target: ContextAsset) => {
    const itemId = target.kind === 'tileset' ? target.asset.id : `sprite-${target.asset.id}`;
    setSelectedItem(itemId, target.kind);
    setSelection(target.kind, target.asset.id, target.asset);
  };

  const openContextMenu = (event: MouseEvent, target: ContextAsset) => {
    event.preventDefault();
    event.stopPropagation();
    selectAsset(target);
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, target });
  };

  const createFolder = async () => {
    if (!folderDialog) return;
    const path = normalizeAssetFolderPath(
      [folderDialog.parentPath, folderName].filter(Boolean).join('/'),
    );
    if (!path) {
      showToast('Folder name is required and cannot contain "." or ".." segments', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const response = await apiFetch(`/api/projects/${projectId}/asset-folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: folderDialog.kind, path }),
      });
      if (!response.ok) throw new Error('Failed to create folder');
      setFolderDialog(null);
      setFolderName('');
      setExpandedItems((current) => [
        ...new Set([...current, `${folderDialog.kind === 'tileset' ? 'assets-tilesets' : 'assets-charsets'}/folder/${path}`]),
      ]);
      await fetchAssets();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Failed to create folder', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteFolder = async (kind: AssetFolderKind, path: string) => {
    if (!window.confirm(`Delete the empty folder "${path}"?`)) return;
    const response = await apiFetch(`/api/projects/${projectId}/asset-folders`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, path }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { message?: string };
      showToast(body.message || 'Only empty folders can be deleted', 'error');
      return;
    }
    await fetchAssets();
  };

  const moveAsset = async () => {
    if (!moveTarget) return;
    setActionLoading(true);
    try {
      const endpoint = moveTarget.kind === 'tileset'
        ? `/api/projects/${projectId}/tilesets/${moveTarget.asset.id}`
        : `/api/projects/${projectId}/sprites/${moveTarget.asset.id}`;
      const response = await apiFetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: movePath }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message || 'Failed to move asset');
      }
      const updated = await response.json() as Tileset | Sprite;
      setSelection(moveTarget.kind, updated.id, updated);
      setMoveTarget(null);
      await fetchAssets();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Failed to move asset', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const inspectDelete = async (target: ContextAsset) => {
    setDeleteTarget(target);
    setDeleteUsage(null);
    const response = await apiFetch(
      `/api/projects/${projectId}/assets/${target.kind}/${target.asset.id}/usage`,
    );
    if (response.ok) setDeleteUsage(await response.json() as AssetUsageResponse);
  };

  const deleteAsset = async () => {
    if (!deleteTarget || !deleteUsage || deleteUsage.usages.length > 0) return;
    setActionLoading(true);
    try {
      const endpoint = deleteTarget.kind === 'tileset'
        ? `/api/projects/${projectId}/tilesets/${deleteTarget.asset.id}`
        : `/api/projects/${projectId}/sprites/${deleteTarget.asset.id}`;
      const response = await apiFetch(endpoint, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message || 'Failed to delete asset');
      }
      window.dispatchEvent(new CustomEvent(ASSET_DELETED_EVENT, {
        detail: { kind: deleteTarget.kind, assetId: deleteTarget.asset.id },
      }));
      clearSelection();
      setSelectedItem(null, null);
      setDeleteTarget(null);
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Failed to delete asset', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const controls = (kind: AssetFolderKind, folderPath: string): ReactNode => (
    <>
      {kind === 'tileset' ? (
        <>
          <TilesetUpload projectId={projectId} folderPath={folderPath} onTilesetUploaded={fetchAssets} iconOnly />
          <TilesetGenerateDialog projectId={projectId} folderPath={folderPath} onTilesetGenerated={fetchAssets} iconOnly />
        </>
      ) : (
        <>
          <CharsetUploadDialog projectId={projectId} folderPath={folderPath} onCharsetUploaded={fetchAssets} iconOnly />
          <CharsetGenerateDialog projectId={projectId} folderPath={folderPath} onCharsetGenerated={fetchAssets} iconOnly />
        </>
      )}
    </>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading assets...</Typography>
      </Box>
    );
  }
  if (error) return <Typography variant="body2" color="error" sx={{ py: 1 }}>Error: {error}</Typography>;

  const unavailableSprites = sprites.filter((sprite) => !sprite.image_source);
  const charsetTitle = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <span>🚶 Charsets</span>
      {unavailableSprites.length > 0 && (
        <Chip
          icon={<Warning sx={{ fontSize: '11px !important', color: '#FF8C00 !important' }} />}
          label={`${unavailableSprites.length} offline`}
          size="small"
          sx={{ height: 16, fontSize: '0.6rem', color: '#FF8C00' }}
        />
      )}
    </Box>
  );

  return (
    <>
      <SimpleTreeView
        expandedItems={expandedItems}
        onExpandedItemsChange={(_event, items) => setExpandedItems(items)}
        selectedItems={selectedItemId || ''}
        sx={{ flexGrow: 1, overflowY: 'auto' }}
      >
        <TreeItem itemId="assets-root" label="🎨 Assets">
          <AssetFolderSection
            rootId="assets-tilesets"
            title={<span>🖼 Tilesets</span>}
            folders={folders.tileset ?? []}
            assets={tilesets}
            emptyLabel="No tilesets"
            controls={(path) => controls('tileset', path)}
            assetItemId={(asset) => asset.id}
            assetLabel={(asset) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">{asset.name}</Typography>
                <GenerationStatusBadge status={asset.generation_metadata?.status} />
              </Box>
            )}
            onAssetSelect={(asset) => selectAsset({ kind: 'tileset', asset })}
            onAssetContextMenu={(event, asset) => openContextMenu(event, { kind: 'tileset', asset })}
            onCreateFolder={(parentPath) => setFolderDialog({ kind: 'tileset', parentPath })}
            onDeleteFolder={(path) => void deleteFolder('tileset', path)}
          />
          <AssetFolderSection
            rootId="assets-charsets"
            title={charsetTitle}
            folders={folders.charset ?? []}
            assets={sprites}
            emptyLabel="No charsets yet"
            controls={(path) => controls('charset', path)}
            assetItemId={(asset) => `sprite-${asset.id}`}
            assetLabel={(asset) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {!asset.image_source ? (
                  <Warning sx={{ fontSize: 14, color: '#FF8C00' }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.image_source}
                    alt={asset.name}
                    style={{ width: 16, height: 16, objectFit: 'contain', imageRendering: 'pixelated' }}
                  />
                )}
                <Typography variant="body2" sx={{ color: asset.image_source ? 'inherit' : '#FF8C00' }}>
                  {asset.name}
                </Typography>
              </Box>
            )}
            onAssetSelect={(asset) => selectAsset({ kind: 'charset', asset })}
            onAssetContextMenu={(event, asset) => openContextMenu(event, { kind: 'charset', asset })}
            onCreateFolder={(parentPath) => setFolderDialog({ kind: 'charset', parentPath })}
            onDeleteFolder={(path) => void deleteFolder('charset', path)}
          />
          <TreeItem itemId="assets-sounds" label="🔊 Sounds (coming soon)">
            <TreeItem itemId="assets-sounds-empty" label="Sound management is not available yet" />
          </TreeItem>
        </TreeItem>
      </SimpleTreeView>

      <TilesetGenerateDialog
        projectId={projectId}
        hideTrigger
        regenerateTilesetId={regenerateTilesetId}
        onClose={() => setRegenerateTilesetId(null)}
        onTilesetGenerated={() => {
          setRegenerateTilesetId(null);
          void fetchAssets();
        }}
      />

      <AssetContextMenu
        position={contextMenu}
        canDelete={
          contextMenu?.target.kind === 'charset'
          || (contextMenu?.target.kind === 'tileset'
            && resolveTilesetOrigin(contextMenu.target.asset.id) === 'project')
        }
        canRegenerate={
          contextMenu?.target.kind === 'tileset'
          && Boolean(contextMenu.target.asset.generation_metadata?.generated)
        }
        onClose={() => setContextMenu(null)}
        onRegenerate={() => {
          if (contextMenu?.target.kind !== 'tileset') return;
          setRegenerateTilesetId(contextMenu.target.asset.id);
          setContextMenu(null);
        }}
        onMove={() => {
          if (!contextMenu) return;
          setMoveTarget(contextMenu.target);
          setMovePath(contextMenu.target.asset.folderPath ?? '');
          setContextMenu(null);
        }}
        onDelete={() => {
          if (!contextMenu) return;
          const target = contextMenu.target;
          setContextMenu(null);
          void inspectDelete(target);
        }}
      />

      <Dialog
        open={folderDialog !== null}
        onClose={() => {
          setFolderDialog(null);
          setFolderName('');
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>New asset folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Folder name"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            helperText={folderDialog?.parentPath ? `Inside ${folderDialog.parentPath}` : undefined}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setFolderDialog(null);
              setFolderName('');
            }}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button onClick={() => void createFolder()} disabled={actionLoading || !folderName.trim()} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={moveTarget !== null} onClose={() => setMoveTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Move {moveTarget?.asset.name}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Folder</InputLabel>
            <Select value={movePath} label="Folder" onChange={(event) => setMovePath(event.target.value)}>
              <MenuItem value="">Root</MenuItem>
              {(moveTarget ? folders[moveTarget.kind] ?? [] : []).map((path) => (
                <MenuItem key={path} value={path}>{path}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveTarget(null)} disabled={actionLoading}>Cancel</Button>
          <Button onClick={() => void moveAsset()} disabled={actionLoading} variant="contained">Move</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Delete {deleteTarget?.asset.name}?</DialogTitle>
        <DialogContent>
          {!deleteUsage ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><CircularProgress size={16} /> <span>Checking usages…</span></Stack>
          ) : deleteUsage.usages.length > 0 ? (
            <Typography color="warning.main">
              This asset is used in {deleteUsage.usages.length} place(s) and cannot be deleted.
            </Typography>
          ) : (
            <Typography>This permanently deletes the asset. This action cannot be undone.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={actionLoading}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={actionLoading || !deleteUsage || deleteUsage.usages.length > 0}
            onClick={() => void deleteAsset()}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
