'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { ChevronRight, ExpandMore, Map as MapIcon } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import { useSelectionStore } from '@/stores/selectionStore';
import { useProjectExplorerStore } from '@/stores/projectExplorerStore';
import type { Map } from '@packages/types';

export const MapsTree = () => {
  const params = useParams();
  const projectId = params?.projectId as string;
  
  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const setSelection = useSelectionStore((state) => state.setSelection);
  const selectedItemId = useProjectExplorerStore((state) => state.selectedItemId);
  const setSelectedItem = useProjectExplorerStore((state) => state.setSelectedItem);

  useEffect(() => {
    if (!projectId) return;

    const fetchMaps = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/maps`);
        if (!response.ok) throw new Error('Failed to fetch maps');
        const data = await response.json();
        setMaps(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMaps();
  }, [projectId]);

  const handleMapSelect = (map: Map) => {
    setSelectedItem(map.id, 'map');
    setSelection('map', map.id, map);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading maps...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ py: 1 }}>
        Error: {error}
      </Typography>
    );
  }

  return (
    <SimpleTreeView
      defaultExpandedItems={['maps-root']}
      selectedItems={selectedItemId || ''}
      sx={{ flexGrow: 1, overflowY: 'auto' }}
    >
      <TreeItem itemId="maps-root" label="📁 Maps">
        {maps.length === 0 ? (
          <TreeItem
            itemId="maps-empty"
            label={
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                No maps yet
              </Typography>
            }
          />
        ) : (
          maps.map((map) => (
            <TreeItem
              key={map.id}
              itemId={map.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MapIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2">{map.name}</Typography>
                </Box>
              }
              onClick={() => handleMapSelect(map)}
            />
          ))
        )}
      </TreeItem>
    </SimpleTreeView>
  );
};
