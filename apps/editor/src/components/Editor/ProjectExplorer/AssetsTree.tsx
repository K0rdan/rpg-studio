'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { ChevronRight, ExpandMore, Image, DirectionsRun, VolumeUp } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import { useSelectionStore } from '@/stores/selectionStore';
import { useProjectExplorerStore } from '@/stores/projectExplorerStore';
import type { Tileset } from '@packages/types';

export const AssetsTree = () => {
  const params = useParams();
  const projectId = params?.projectId as string;
  
  const [tilesets, setTilesets] = useState<Tileset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const setSelection = useSelectionStore((state) => state.setSelection);
  const selectedItemId = useProjectExplorerStore((state) => state.selectedItemId);
  const setSelectedItem = useProjectExplorerStore((state) => state.setSelectedItem);

  useEffect(() => {
    if (!projectId) return;

    const fetchTilesets = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tilesets?projectId=${projectId}`);
        if (!response.ok) throw new Error('Failed to fetch tilesets');
        const data = await response.json();
        setTilesets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTilesets();
  }, [projectId]);

  const handleTilesetSelect = (tileset: Tileset) => {
    setSelectedItem(tileset.id, 'tileset');
    setSelection('tileset', tileset.id, tileset);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading assets...
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
      defaultExpandedItems={['assets-root', 'assets-tilesets']}
      selectedItems={selectedItemId || ''}
      sx={{ flexGrow: 1, overflowY: 'auto' }}
    >
      <TreeItem itemId="assets-root" label="🎨 Assets">
        {/* Tilesets */}
        <TreeItem itemId="assets-tilesets" label="🖼 Tilesets">
          {tilesets.length === 0 ? (
            <TreeItem
              itemId="assets-tilesets-empty"
              label={
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  No tilesets
                </Typography>
              }
            />
          ) : (
            tilesets.map((tileset) => (
              <TreeItem
                key={tileset.id}
                itemId={tileset.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Image sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{tileset.name}</Typography>
                  </Box>
                }
                onClick={() => handleTilesetSelect(tileset)}
              />
            ))
          )}
        </TreeItem>

        {/* Charsets (placeholder) */}
        <TreeItem itemId="assets-charsets" label="🚶 Charsets">
          <TreeItem
            itemId="assets-charsets-empty"
            label={
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                No charsets
              </Typography>
            }
          />
        </TreeItem>

        {/* Sounds (placeholder) */}
        <TreeItem itemId="assets-sounds" label="🔊 Sounds">
          <TreeItem
            itemId="assets-sounds-empty"
            label={
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                No sounds
              </Typography>
            }
          />
        </TreeItem>
      </TreeItem>
    </SimpleTreeView>
  );
};
