'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Chip } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { Image as ImageIcon, Warning } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import { useSelectionStore } from '@/stores/selectionStore';
import { useProjectExplorerStore } from '@/stores/projectExplorerStore';
import { resolveTilesetOrigin } from '@/lib/tilesetOrigin';
import type { AssetKind, Tileset, Sprite } from '@packages/types';
import TilesetGenerateDialog from '@/components/TilesetGenerateDialog';
import CharsetGenerateDialog from '@/components/CharsetGenerateDialog';
import { AssetContextMenu } from './AssetContextMenu';

const ASSET_DELETE_REQUEST_EVENT = 'rpgstudio:asset-delete-request';
const ASSET_DELETED_EVENT = 'rpgstudio:asset-deleted';

type ContextAsset =
  | { kind: 'tileset'; asset: Tileset }
  | { kind: 'charset'; asset: Sprite };

export const AssetsTree = () => {
  const params = useParams();
  const projectId = params?.projectId as string;

  const [tilesets, setTilesets] = useState<Tileset[]>([]);
  const [sprites, setSprites] = useState<Sprite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    target: ContextAsset;
  } | null>(null);

  // Controlled expansion so we can detect when the Charsets node is collapsed
  const [expandedItems, setExpandedItems] = useState<string[]>([
    'assets-root', 'assets-tilesets', 'assets-charsets',
  ]);

  const setSelection = useSelectionStore((state) => state.setSelection);
  const selectedItemId = useProjectExplorerStore((state) => state.selectedItemId);
  const setSelectedItem = useProjectExplorerStore((state) => state.setSelectedItem);

  const fetchAssets = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      const [tilesetsRes, spritesRes] = await Promise.all([
        apiFetch(`/api/projects/${projectId}/tilesets`),
        apiFetch(`/api/projects/${projectId}/sprites`),
      ]);

      if (!tilesetsRes.ok) throw new Error('Failed to fetch tilesets');
      setTilesets(await tilesetsRes.json());

      if (!spritesRes.ok) throw new Error('Failed to fetch charsets');
      setSprites(await spritesRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchAssets();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchAssets]);

  useEffect(() => {
    const handleAssetDeleted = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: AssetKind; assetId: string }>).detail;
      if (detail?.kind === 'tileset') {
        setTilesets((current) => current.filter((asset) => asset.id !== detail.assetId));
      } else if (detail?.kind === 'charset') {
        setSprites((current) => current.filter((asset) => asset.id !== detail.assetId));
      }
    };
    window.addEventListener(ASSET_DELETED_EVENT, handleAssetDeleted);
    return () => window.removeEventListener(ASSET_DELETED_EVENT, handleAssetDeleted);
  }, []);

  const unavailableSprites = sprites.filter(s => !s.image_source);
  const charsetsSectionCollapsed = !expandedItems.includes('assets-charsets');

  const handleTilesetSelect = (tileset: Tileset) => {
    setSelectedItem(tileset.id, 'tileset');
    setSelection('tileset', tileset.id, tileset);
  };

  const handleSpriteSelect = (sprite: Sprite) => {
    setSelectedItem(`sprite-${sprite.id}`, 'charset');
    setSelection('charset', sprite.id, sprite);
  };

  const openContextMenu = (
    event: React.MouseEvent,
    target: ContextAsset,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (target.kind === 'tileset') {
      handleTilesetSelect(target.asset);
    } else {
      handleSpriteSelect(target.asset);
    }
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, target });
  };

  const requestDelete = () => {
    if (!contextMenu) return;
    const { target } = contextMenu;
    setContextMenu(null);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(ASSET_DELETE_REQUEST_EVENT, {
        detail: { kind: target.kind, assetId: target.asset.id },
      }));
    }, 0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading assets...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ py: 1 }}>Error: {error}</Typography>
    );
  }

  /** Label for the Charsets parent node — shows an amber badge when any sprite is unavailable. */
  const charsetsLabel = (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <span>🚶 Charsets</span>
        {unavailableSprites.length > 0 && (
          <Chip
            icon={<Warning sx={{ fontSize: '11px !important', color: '#FF8C00 !important' }} />}
            label={`${unavailableSprites.length} offline`}
            size="small"
            sx={{
              height: 16,
              fontSize: '0.6rem',
              bgcolor: '#3d2600',
              color: '#FF8C00',
              border: '1px solid #FF8C00',
              '& .MuiChip-label': { px: 0.5 },
              '& .MuiChip-icon': { ml: 0.25 },
              opacity: charsetsSectionCollapsed ? 1 : 0.6,
            }}
          />
        )}
      </Box>
      <CharsetGenerateDialog projectId={projectId} onCharsetGenerated={fetchAssets} iconOnly />
    </Box>
  );

  const tilesetsLabel = (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <span>🖼 Tilesets</span>
      <TilesetGenerateDialog projectId={projectId} onTilesetGenerated={fetchAssets} iconOnly />
    </Box>
  );

  return (
    <>
    <SimpleTreeView
      expandedItems={expandedItems}
      onExpandedItemsChange={(_e, items) => setExpandedItems(items)}
      selectedItems={selectedItemId || ''}
      sx={{ flexGrow: 1, overflowY: 'auto' }}
    >
      <TreeItem itemId="assets-root" label="🎨 Assets">

        {/* Tilesets */}
        <TreeItem itemId="assets-tilesets" label={tilesetsLabel}>
          {tilesets.length === 0 ? (
            <TreeItem
              itemId="assets-tilesets-empty"
              label={
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  No tilesets
                </Typography>
              }
            />
          ) : (
            tilesets.map((tileset) => (
              <TreeItem
                key={tileset.id}
                itemId={tileset.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ImageIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{tileset.name}</Typography>
                  </Box>
                }
                onClick={() => handleTilesetSelect(tileset)}
                onContextMenu={(event) => openContextMenu(event, { kind: 'tileset', asset: tileset })}
              />
            ))
          )}
        </TreeItem>

        {/* Charsets / Sprites */}
        <TreeItem itemId="assets-charsets" label={charsetsLabel}>
          {sprites.length === 0 ? (
            <TreeItem
              itemId="assets-charsets-empty"
              label={
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  No charsets yet
                </Typography>
              }
            />
          ) : (
            sprites.map((sprite) => {
              const isOffline = !sprite.image_source;
              return (
                <TreeItem
                  key={sprite.id}
                  itemId={`sprite-${sprite.id}`}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {/* Thumbnail or offline icon */}
                      {isOffline ? (
                        <Warning sx={{ fontSize: 14, color: '#FF8C00', flexShrink: 0 }} />
                      ) : sprite.image_source ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sprite.image_source}
                          alt={sprite.name}
                          style={{
                            width: 16,
                            height: 16,
                            objectFit: 'contain',
                            imageRendering: 'pixelated',
                            border: '1px solid #444',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <ImageIcon sx={{ fontSize: 16 }} />
                      )}

                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{ color: isOffline ? '#FF8C00' : 'inherit' }}
                        >
                          {sprite.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: isOffline ? '#a05000' : '#666', fontSize: '0.65rem' }}>
                          {isOffline
                            ? '⚠ storage offline'
                            : `${sprite.frame_width}×${sprite.frame_height} px/frame`}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  onClick={() => handleSpriteSelect(sprite)}
                  onContextMenu={(event) => openContextMenu(event, { kind: 'charset', asset: sprite })}
                />
              );
            })
          )}
        </TreeItem>

        {/* Sounds (placeholder) */}
        <TreeItem itemId="assets-sounds" label="🔊 Sounds (coming soon)">
          <TreeItem
            itemId="assets-sounds-empty"
            label={
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Sound management is not available yet
              </Typography>
            }
          />
        </TreeItem>

      </TreeItem>
    </SimpleTreeView>
    <AssetContextMenu
      position={contextMenu}
      canDelete={
        contextMenu?.target.kind === 'charset'
        || (contextMenu?.target.kind === 'tileset'
          && resolveTilesetOrigin(contextMenu.target.asset.id) === 'project')
      }
      onClose={() => setContextMenu(null)}
      onDelete={requestDelete}
    />
    </>
  );
};
