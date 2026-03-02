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
import { GiveItemCommand, CommandType } from '@packages/types';

interface EditGiveItemDialogProps {
  open: boolean;
  command: GiveItemCommand | null;
  onClose: () => void;
  onSave: (command: GiveItemCommand) => void;
}

export const EditGiveItemDialog = ({ open, command, onClose, onSave }: EditGiveItemDialogProps) => {
  const [itemId, setItemId] = useState<string>('potion_health');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (command) {
      setItemId(command.parameters.itemId);
      setQuantity(command.parameters.quantity);
    } else {
      setItemId('potion_health');
      setQuantity(1);
    }
  }, [command, open]);

  const handleSave = () => {
    const newCommand: GiveItemCommand = {
      type: CommandType.GiveItem,
      parameters: {
        itemId,
        quantity,
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
      <DialogTitle>Edit Command: Give Item</DialogTitle>

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
          <InputLabel>Item</InputLabel>
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)} label="Item">
            <MenuItem value="potion_health">Health Potion</MenuItem>
            <MenuItem value="potion_mana">Mana Potion</MenuItem>
            <MenuItem value="key_bronze">Bronze Key</MenuItem>
            <MenuItem value="key_silver">Silver Key</MenuItem>
            <MenuItem value="key_gold">Gold Key</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          fullWidth
          margin="normal"
          required
          inputProps={{ min: 1 }}
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
