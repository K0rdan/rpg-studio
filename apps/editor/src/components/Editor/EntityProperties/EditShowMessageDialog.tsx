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
} from '@mui/material';
import { ShowMessageCommand, CommandType } from '@packages/types';

interface EditShowMessageDialogProps {
  open: boolean;
  command: ShowMessageCommand | null;
  onClose: () => void;
  onSave: (command: ShowMessageCommand) => void;
}

export const EditShowMessageDialog = ({ open, command, onClose, onSave }: EditShowMessageDialogProps) => {
  const [text, setText] = useState('');
  const [face, setFace] = useState<string>('');
  const [position, setPosition] = useState<'top' | 'middle' | 'bottom'>('bottom');

  useEffect(() => {
    if (command) {
      setText(command.parameters.text);
      setFace(command.parameters.face || '');
      setPosition(command.parameters.position || 'bottom');
    } else {
      setText('');
      setFace('');
      setPosition('bottom');
    }
  }, [command, open]);

  const handleSave = () => {
    const newCommand: ShowMessageCommand = {
      type: CommandType.ShowMessage,
      parameters: {
        text,
        ...(face && { face }),
        position,
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
      <DialogTitle>Edit Command: Show Message</DialogTitle>

      <DialogContent>
        <TextField
          label="Message Text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          rows={4}
          fullWidth
          margin="normal"
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
          <InputLabel>Character Face</InputLabel>
          <Select value={face} onChange={(e) => setFace(e.target.value)} label="Character Face">
            <MenuItem value="">None</MenuItem>
            <MenuItem value="hero">Hero</MenuItem>
            <MenuItem value="npc1">NPC 1</MenuItem>
            <MenuItem value="npc2">NPC 2</MenuItem>
          </Select>
        </FormControl>

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
          <InputLabel>Position</InputLabel>
          <Select value={position} onChange={(e) => setPosition(e.target.value as any)} label="Position">
            <MenuItem value="top">Top</MenuItem>
            <MenuItem value="middle">Middle</MenuItem>
            <MenuItem value="bottom">Bottom</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#aaa' }}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={!text.trim()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
