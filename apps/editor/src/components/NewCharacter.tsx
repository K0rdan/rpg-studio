'use client';

import type { Character } from '@packages/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import AddIcon from '@mui/icons-material/Add';
import Stack from '@mui/material/Stack';

interface NewCharacterProps {
  projectId: string;
}

export default function NewCharacter({ projectId }: NewCharacterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [attack, setAttack] = useState(10);
  const [defense, setDefense] = useState(10);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, hp, maxHp, attack, defense }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create character');
      }

      setIsOpen(false);
      setName('');
      setHp(100);
      setMaxHp(100);
      setAttack(10);
      setDefense(10);
      showToast('Character created successfully', 'success');
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('An unknown error occurred', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="contained" 
        color="primary" 
        startIcon={<AddIcon />}
        onClick={() => setIsOpen(true)}
        sx={{ mb: 2 }}
      >
        New Character
      </Button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Create New Character</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Character Name"
              type="text"
              fullWidth
              variant="outlined"
              placeholder="e.g., Hero"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                margin="dense"
                id="hp"
                label="HP"
                type="number"
                fullWidth
                variant="outlined"
                value={hp}
                onChange={(e) => setHp(Number(e.target.value))}
                inputProps={{ min: 1 }}
              />
              <TextField
                margin="dense"
                id="maxHp"
                label="Max HP"
                type="number"
                fullWidth
                variant="outlined"
                value={maxHp}
                onChange={(e) => setMaxHp(Number(e.target.value))}
                inputProps={{ min: 1 }}
              />
              <TextField
                margin="dense"
                id="attack"
                label="Attack"
                type="number"
                fullWidth
                variant="outlined"
                value={attack}
                onChange={(e) => setAttack(Number(e.target.value))}
                inputProps={{ min: 0 }}
              />
              <TextField
                margin="dense"
                id="defense"
                label="Defense"
                type="number"
                fullWidth
                variant="outlined"
                value={defense}
                onChange={(e) => setDefense(Number(e.target.value))}
                inputProps={{ min: 0 }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsOpen(false)} color="secondary">
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
