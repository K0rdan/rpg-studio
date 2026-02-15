import { Box, Typography, TextField, Divider } from '@mui/material';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Map } from '@packages/types';

interface MapPropertiesProps {
  mapId: string;
}

export const MapProperties = ({ mapId }: MapPropertiesProps) => {
  const params = useParams();
  const projectId = params?.projectId as string;

  const [map, setMap] = useState<Map | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMap = async () => {
      if (!mapId || !projectId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/maps/${mapId}`);
        if (!response.ok) throw new Error('Failed to fetch map');
        const data = await response.json();
        setMap(data);
      } catch (error) {
        console.error('Error fetching map:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMap();
  }, [mapId, projectId]);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Loading map properties...
        </Typography>
      </Box>
    );
  }

  if (!map) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="error">
          Failed to load map
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Map Properties
        </Typography>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Name"
            value={map.name}
            size="small"
            InputProps={{ readOnly: true }}
            fullWidth
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Width"
              value={map.width}
              size="small"
              InputProps={{ readOnly: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Height"
              value={map.height}
              size="small"
              InputProps={{ readOnly: true }}
              sx={{ flex: 1 }}
            />
          </Box>

          <TextField
            label="Tileset"
            value={map.tilesetId || 'None'}
            size="small"
            InputProps={{ readOnly: true }}
            fullWidth
          />

          <TextField
            label="Layers"
            value={map.layers?.length || 0}
            size="small"
            InputProps={{ readOnly: true }}
            fullWidth
          />
        </Box>
      </Box>
    </Box>
  );
};
