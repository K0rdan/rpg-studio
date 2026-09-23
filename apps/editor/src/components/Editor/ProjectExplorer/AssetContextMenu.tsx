'use client';

import { AutoAwesome, Delete, DriveFileMove } from '@mui/icons-material';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';

interface AssetContextMenuProps {
  position: { mouseX: number; mouseY: number } | null;
  canDelete: boolean;
  canRegenerate?: boolean;
  onClose: () => void;
  onDelete: () => void;
  onMove: () => void;
  onRegenerate?: () => void;
}

export const AssetContextMenu = ({
  position,
  canDelete,
  canRegenerate = false,
  onClose,
  onDelete,
  onMove,
  onRegenerate,
}: AssetContextMenuProps) => (
  <Menu
    open={position !== null}
    onClose={onClose}
    anchorReference="anchorPosition"
    anchorPosition={
      position ? { top: position.mouseY, left: position.mouseX } : undefined
    }
  >
    {canRegenerate && (
      <MenuItem
        onClick={onRegenerate}
        aria-label="Regenerate tileset"
      >
        <ListItemIcon><AutoAwesome fontSize="small" /></ListItemIcon>
        <ListItemText>Regenerate…</ListItemText>
      </MenuItem>
    )}
    <MenuItem onClick={onMove}>
      <ListItemIcon><DriveFileMove fontSize="small" /></ListItemIcon>
      <ListItemText>Move to folder…</ListItemText>
    </MenuItem>
    <MenuItem disabled={!canDelete} onClick={onDelete}>
      <ListItemIcon><Delete fontSize="small" /></ListItemIcon>
      <ListItemText>
        {canDelete ? 'Delete asset' : 'Built-in asset'}
      </ListItemText>
    </MenuItem>
  </Menu>
);
