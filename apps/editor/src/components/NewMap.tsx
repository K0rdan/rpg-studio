'use client';

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

interface NewMapProps {
  projectId: string;
  onMapCreated?: () => void;
}

export default function NewMap({ projectId, onMapCreated }: NewMapProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [mapName, setMapName] = useState('');
  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(15);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!mapName) {
      showToast('Map name is required', 'error');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/maps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: mapName, width, height }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create map');
      }

      setModalOpen(false);
      setMapName('');
      setWidth(20);
      setHeight(15);
      showToast('Map created successfully', 'success');
      
      if (onMapCreated) {
        onMapCreated();
      }
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
        onClick={() => setModalOpen(true)}
        sx={{ mb: 2 }}
      >
        New Map
      </Button>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Create New Map</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Map Name"
              type="text"
              fullWidth
              variant="outlined"
              placeholder="Map Name"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                margin="dense"
                id="width"
                label="Width"
                type="number"
                fullWidth
                variant="outlined"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                inputProps={{ min: 1 }}
              />
              <TextField
                margin="dense"
                id="height"
                label="Height"
                type="number"
                fullWidth
                variant="outlined"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                inputProps={{ min: 1 }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalOpen(false)} color="secondary">
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
