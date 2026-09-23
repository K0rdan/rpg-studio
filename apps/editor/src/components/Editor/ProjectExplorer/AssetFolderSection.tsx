'use client';

import type { MouseEvent, ReactNode } from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { CreateNewFolder, DeleteOutlined, Folder } from '@mui/icons-material';
import type { Sprite, Tileset } from '@packages/types';
import { assetFolderAncestors } from '@/lib/assetFolders';

type Asset = Tileset | Sprite;

export function GenerationStatusBadge({ status }: { status?: string }) {
  if (status !== 'stale') {
    return null;
  }
  return (
    <Chip
      label="Stale"
      size="small"
      color="warning"
      aria-label="Stale tileset"
      sx={{ height: 16, fontSize: '0.6rem' }}
    />
  );
}

interface AssetFolderSectionProps<TAsset extends Asset> {
  rootId: string;
  title: ReactNode;
  folders: string[];
  assets: TAsset[];
  emptyLabel: string;
  controls: (folderPath: string) => ReactNode;
  assetItemId: (asset: TAsset) => string;
  assetLabel: (asset: TAsset) => ReactNode;
  onAssetSelect: (asset: TAsset) => void;
  onAssetContextMenu: (event: MouseEvent, asset: TAsset) => void;
  onCreateFolder: (parentPath: string) => void;
  onDeleteFolder: (path: string) => void;
}

function stopTreeEvent(event: MouseEvent, action: () => void) {
  event.preventDefault();
  event.stopPropagation();
  action();
}

export function AssetFolderSection<TAsset extends Asset>({
  rootId,
  title,
  folders,
  assets,
  emptyLabel,
  controls,
  assetItemId,
  assetLabel,
  onAssetSelect,
  onAssetContextMenu,
  onCreateFolder,
  onDeleteFolder,
}: AssetFolderSectionProps<TAsset>) {
  const allFolders = new Set(folders);
  assets.forEach((asset) => {
    assetFolderAncestors(asset.folderPath ?? '').forEach((path) => allFolders.add(path));
  });

  const renderLevel = (parentPath: string): ReactNode => {
    const directFolders = [...allFolders]
      .filter((path) => {
        const separator = path.lastIndexOf('/');
        return (separator === -1 ? '' : path.slice(0, separator)) === parentPath;
      })
      .sort((left, right) => left.localeCompare(right));
    const directAssets = assets
      .filter((asset) => (asset.folderPath ?? '') === parentPath)
      .sort((left, right) => left.name.localeCompare(right.name));

    return (
      <>
        {directFolders.map((path) => {
          const name = path.slice(path.lastIndexOf('/') + 1);
          return (
            <TreeItem
              key={path}
              itemId={`${rootId}/folder/${path}`}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 0.5 }}>
                  <Folder sx={{ fontSize: 16, color: 'warning.main' }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{name}</Typography>
                  {controls(path)}
                  <Tooltip title="New subfolder">
                    <IconButton
                      size="small"
                      aria-label={`Create subfolder in ${path}`}
                      onClick={(event) => stopTreeEvent(event, () => onCreateFolder(path))}
                    >
                      <CreateNewFolder fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete empty folder">
                    <IconButton
                      size="small"
                      aria-label={`Delete folder ${path}`}
                      onClick={(event) => stopTreeEvent(event, () => onDeleteFolder(path))}
                    >
                      <DeleteOutlined fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              {renderLevel(path)}
            </TreeItem>
          );
        })}
        {directAssets.map((asset) => (
          <TreeItem
            key={asset.id}
            itemId={assetItemId(asset)}
            label={assetLabel(asset)}
            onClick={() => onAssetSelect(asset)}
            onContextMenu={(event) => onAssetContextMenu(event, asset)}
          />
        ))}
      </>
    );
  };

  return (
    <TreeItem
      itemId={rootId}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {title}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {controls('')}
            <Tooltip title="New folder">
              <IconButton
                size="small"
                aria-label={`Create folder in ${rootId}`}
                onClick={(event) => stopTreeEvent(event, () => onCreateFolder(''))}
              >
                <CreateNewFolder fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      }
    >
      {allFolders.size === 0 && assets.length === 0 ? (
        <TreeItem
          itemId={`${rootId}-empty`}
          label={<Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{emptyLabel}</Typography>}
        />
      ) : renderLevel('')}
    </TreeItem>
  );
}
