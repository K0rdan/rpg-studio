'use client';

import Link from 'next/link';
import type { Map } from '@packages/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';

interface MapListProps {
  projectId: string;
  maps: Map[];
}

export default function MapList({ projectId, maps }: MapListProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const handleDelete = async (mapId: string) => {
    if (!confirm('Are you sure you want to delete this map?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/maps/${mapId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete map');
      }

      showToast('Map deleted successfully', 'success');
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('An unknown error occurred', 'error');
      }
    }
  };

  return (
    <div>
      <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 4 }}>
        Maps
      </Typography>
      {maps.length === 0 ? (
        <Typography variant="body1">No maps found.</Typography>
      ) : (
        <Grid container spacing={2}>
          {maps.map((map) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={map.id}>
              <Card>
                <CardContent>
                  <Link href={`/projects/${projectId}/maps/${map.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="h6" component="div" gutterBottom sx={{ '&:hover': { textDecoration: 'underline' } }}>
                      {map.name}
                    </Typography>
                  </Link>
                  <Typography color="text.secondary">
                    Size: {map.width}x{map.height}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    color="error" 
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(map.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  );
}
