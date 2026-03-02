'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from '@mui/material';
import { TeleportPlayerCommand, CommandType } from '@packages/types';

interface EditTeleportPlayerDialogProps {
  open: boolean;
  command: TeleportPlayerCommand | null;
  onClose: () => void;
  onSave: (command: TeleportPlayerCommand) => void;
}

export const EditTeleportPlayerDialog = ({ open, command, onClose, onSave }: EditTeleportPlayerDialogProps) => {
  const [mapId, setMapId] = useState<string>('');
  const [x, setX] = useState<number>(0);
  const [y, setY] = useState<number>(0);
  const [direction, setDirection] = useState<'up' | 'down' | 'left' | 'right'>('down');

  useEffect(() => {
    if (command) {
      setMapId(command.parameters.mapId || '');
      setX(command.parameters.x);
      setY(command.parameters.y);
      setDirection(command.parameters.direction || 'down');
    } else {
      setMapId('');
      setX(0);
      setY(0);
      setDirection('down');
    }
  }, [command, open]);

  const handleSave = () => {
    const newCommand: TeleportPlayerCommand = {
      type: CommandType.TeleportPlayer,
      parameters: {
        ...(mapId && { mapId }),
        x,
        y,
        direction,
      },
    };
    onSave(newCommand);
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
      <DialogTitle>Edit Command: Teleport Player</DialogTitle>

      <DialogContent>
        <FormControl
          fullWidth
          margin="normal"
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: '#444' },
              '&:hover fieldset': { borderColor: '#666' },
              '&.Mui-focused fieldset': { borderColor: '#2196F3' },
            },
            '& .MuiInputLabel-root': { color: '#aaa' },
          }}
        >
          <InputLabel>Target Map</InputLabel>
          <Select value={mapId} onChange={(e) => setMapId(e.target.value)} label="Target Map">
            <MenuItem value="">Same Map</MenuItem>
            <MenuItem value="map_001">Town</MenuItem>
            <MenuItem value="map_002">Castle</MenuItem>
            <MenuItem value="map_003">Dungeon</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="X"
            type="number"
            value={x}
            onChange={(e) => setX(parseInt(e.target.value) || 0)}
            fullWidth
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#2196F3' },
              },
              '& .MuiInputLabel-root': { color: '#aaa' },
            }}
          />
          <TextField
            label="Y"
            type="number"
            value={y}
            onChange={(e) => setY(parseInt(e.target.value) || 0)}
            fullWidth
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#2196F3' },
              },
              '& .MuiInputLabel-root': { color: '#aaa' },
            }}
          />
        </Box>

        <FormControl
          fullWidth
          margin="normal"
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: '#444' },
              '&:hover fieldset': { borderColor: '#666' },
              '&.Mui-focused fieldset': { borderColor: '#2196F3' },
            },
            '& .MuiInputLabel-root': { color: '#aaa' },
          }}
        >
          <InputLabel>Direction</InputLabel>
          <Select value={direction} onChange={(e) => setDirection(e.target.value as any)} label="Direction">
            <MenuItem value="up">Up</MenuItem>
            <MenuItem value="down">Down</MenuItem>
            <MenuItem value="left">Left</MenuItem>
            <MenuItem value="right">Right</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#aaa' }}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
