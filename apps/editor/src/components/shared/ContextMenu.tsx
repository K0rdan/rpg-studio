import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import {
  Add,
  Edit,
  FileCopy,
  Delete,
  Settings,
} from '@mui/icons-material';

interface ContextMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onNew?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onProperties?: () => void;
}

export const ContextMenu = ({
  anchorEl,
  open,
  onClose,
  onNew,
  onEdit,
  onDuplicate,
  onDelete,
  onProperties,
}: ContextMenuProps) => {
  const handleAction = (action?: () => void) => {
    if (action) action();
    onClose();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      {onNew && (
        <MenuItem onClick={() => handleAction(onNew)}>
          <ListItemIcon>
            <Add fontSize="small" />
          </ListItemIcon>
          <ListItemText>New</ListItemText>
        </MenuItem>
      )}
      
      {onEdit && (
        <MenuItem onClick={() => handleAction(onEdit)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
      )}
      
      {onDuplicate && (
        <MenuItem onClick={() => handleAction(onDuplicate)}>
          <ListItemIcon>
            <FileCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
      )}
      
      {(onNew || onEdit || onDuplicate) && (onDelete || onProperties) && <Divider />}
      
      {onDelete && (
        <MenuItem onClick={() => handleAction(onDelete)}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      )}
      
      {onProperties && (
        <MenuItem onClick={() => handleAction(onProperties)}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Properties</ListItemText>
        </MenuItem>
      )}
    </Menu>
  );
};
