'use client';

import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

interface TilesetCardProps {
  tileset: {
    id: string;
    name: string;
    image_source: string;
    tile_width: number;
    tile_height: number;
  };
  projectId: string;
  onDeleted?: () => void;
}

export default function TilesetCard({ tileset, projectId, onDeleted }: TilesetCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/tilesets/${tileset.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.maps) {
          // Tileset is in use
          const mapNames = errorData.maps.map((m: { name: string }) => m.name).join(', ');
          showToast(
            `Cannot delete tileset: it is used by ${mapNames}`,
            'error'
          );
        } else {
          throw new Error(errorData.message || 'Failed to delete tileset');
        }
        return;
      }

      showToast(`Tileset "${tileset.name}" deleted successfully`, 'success');
      setDeleteDialogOpen(false);
      if (onDeleted) {
        onDeleted();
      }
    } catch (error) {
      console.error('Error deleting tileset:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to delete tileset',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ position: 'relative', width: '100%', paddingTop: '75%' }}>
          {imageLoading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress size={24} />
            </Box>
          )}
          {!imageError && tileset.image_source && (
            <CardMedia
              component="img"
              image={tileset.image_source}
              alt={tileset.name}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: imageLoading ? 'none' : 'block',
              }}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          )}
          {imageError && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.200',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Image not available
              </Typography>
            </Box>
          )}
        </Box>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div" noWrap>
            {tileset.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {tileset.tile_width} × {tileset.tile_height} px
          </Typography>
        </CardContent>
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton
            size="small"
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
            aria-label="delete tileset"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Card>

      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Tileset</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{tileset.name}&quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : null}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}


