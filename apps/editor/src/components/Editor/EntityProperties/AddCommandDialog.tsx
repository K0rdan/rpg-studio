'use client';

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Paper, Typography } from '@mui/material';
import { CommandType } from '@packages/types';
import {
  Message as MessageIcon,
  MeetingRoom as TeleportIcon,
  CardGiftcard as GiveItemIcon,
} from '@mui/icons-material';

interface AddCommandDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectCommandType: (type: CommandType) => void;
}

const commandTypes = [
  {
    type: CommandType.ShowMessage,
    label: 'Show Message',
    icon: MessageIcon,
    description: 'Display text to the player',
  },
  {
    type: CommandType.TeleportPlayer,
    label: 'Teleport Player',
    icon: TeleportIcon,
    description: 'Move player to a location',
  },
  {
    type: CommandType.GiveItem,
    label: 'Give Item',
    icon: GiveItemIcon,
    description: 'Add item to inventory',
  },
];

export const AddCommandDialog = ({ open, onClose, onSelectCommandType }: AddCommandDialogProps) => {
  const handleSelectType = (type: CommandType) => {
    onSelectCommandType(type);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#2d2d2d',
          color: '#fff',
        },
      }}
    >
      <DialogTitle>Add Command</DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" sx={{ color: '#aaa', mb: 2 }}>
          Select command type:
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          {commandTypes.map(({ type, label, icon: Icon, description }) => (
            <Paper
              key={type}
              onClick={() => handleSelectType(type)}
              sx={{
                p: 2,
                bgcolor: '#1e1e1e',
                border: '1px solid #444',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: '#3d3d3d',
                  borderColor: '#2196F3',
                },
              }}
            >
              <Icon sx={{ fontSize: 48, color: '#2196F3' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, textAlign: 'center' }}>
                {label}
              </Typography>
              <Typography variant="caption" sx={{ color: '#888', textAlign: 'center' }}>
                {description}
              </Typography>
            </Paper>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#aaa' }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
