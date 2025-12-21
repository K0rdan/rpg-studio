'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import TilesetUpload from './TilesetUpload';
import TilesetCard from './TilesetCard';
import { useToast } from '@/context/ToastContext';

interface Tileset {
  id: string;
  name: string;
  image_source: string;
  tile_width: number;
  tile_height: number;
  projectId?: string;
}

interface TilesetListProps {
  projectId: string;
}

export default function TilesetList({ projectId }: TilesetListProps) {
  const [tilesets, setTilesets] = useState<Tileset[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchTilesets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tilesets`);
      if (!response.ok) {
        throw new Error('Failed to fetch tilesets');
      }
      const data = await response.json();
      setTilesets(data);
    } catch (error) {
      console.error('Error fetching tilesets:', error);
      showToast('Failed to load tilesets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTilesets();
  }, [projectId]);

  const handleTilesetUploaded = () => {
    fetchTilesets();
  };

  const handleTilesetDeleted = () => {
    fetchTilesets();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tilesets</Typography>
        <TilesetUpload projectId={projectId} onTilesetUploaded={handleTilesetUploaded} />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : tilesets.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tilesets yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload your first tileset to get started
          </Typography>
          <TilesetUpload projectId={projectId} onTilesetUploaded={handleTilesetUploaded} />
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {tilesets.map((tileset) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={tileset.id}>
              <TilesetCard
                tileset={tileset}
                projectId={projectId}
                onDeleted={handleTilesetDeleted}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}


