'use client';

import { Delete } from '@mui/icons-material';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';

interface AssetContextMenuProps {
  position: { mouseX: number; mouseY: number } | null;
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export const AssetContextMenu = ({
  position,
  canDelete,
  onClose,
  onDelete,
}: AssetContextMenuProps) => (
  <Menu
    open={position !== null}
    onClose={onClose}
    anchorReference="anchorPosition"
    anchorPosition={
      position ? { top: position.mouseY, left: position.mouseX } : undefined
    }
  >
    <MenuItem disabled={!canDelete} onClick={onDelete}>
      <ListItemIcon><Delete fontSize="small" /></ListItemIcon>
      <ListItemText>
        {canDelete ? 'Delete asset' : 'Built-in asset'}
      </ListItemText>
    </MenuItem>
  </Menu>
);
