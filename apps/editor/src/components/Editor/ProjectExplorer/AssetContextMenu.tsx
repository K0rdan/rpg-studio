'use client';

import { Delete, DriveFileMove } from '@mui/icons-material';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';

interface AssetContextMenuProps {
  position: { mouseX: number; mouseY: number } | null;
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => void;
  onMove: () => void;
}

export const AssetContextMenu = ({
  position,
  canDelete,
  onClose,
  onDelete,
  onMove,
}: AssetContextMenuProps) => (
  <Menu
    open={position !== null}
    onClose={onClose}
    anchorReference="anchorPosition"
    anchorPosition={
      position ? { top: position.mouseY, left: position.mouseX } : undefined
    }
  >
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
