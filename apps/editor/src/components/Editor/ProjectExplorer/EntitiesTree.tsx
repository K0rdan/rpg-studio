'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { ChevronRight, ExpandMore, Person, Group, Dangerous } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import { useSelectionStore } from '@/stores/selectionStore';
import { useProjectExplorerStore } from '@/stores/projectExplorerStore';
import type { Entity, EntityType } from '@packages/types';

export const EntitiesTree = () => {
  const params = useParams();
  const projectId = params?.projectId as string;
  
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const setSelection = useSelectionStore((state) => state.setSelection);
  const selectedItemId = useProjectExplorerStore((state) => state.selectedItemId);
  const setSelectedItem = useProjectExplorerStore((state) => state.setSelectedItem);

  useEffect(() => {
    if (!projectId) return;

    const fetchEntities = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/entities`);
        if (!response.ok) {
          // If endpoint doesn't exist yet, just set empty array
          if (response.status === 404) {
            setEntities([]);
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch entities');
        }
        const data = await response.json();
        setEntities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchEntities();
  }, [projectId]);

  const handleEntitySelect = (entity: Entity) => {
    setSelectedItem(entity.id, 'entity');
    setSelection('entity', entity.id, entity);
  };

  const groupedEntities = {
    player_spawn: entities.filter((e) => e.type === 'player_spawn'),
    npc: entities.filter((e) => e.type === 'npc'),
    interaction: entities.filter((e) => e.type === 'interaction'),
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading entities...
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
      defaultExpandedItems={['entities-root']}
      selectedItems={selectedItemId || ''}
      sx={{ flexGrow: 1, overflowY: 'auto' }}
    >
      <TreeItem itemId="entities-root" label="👤 Entities">
        {/* Player Spawn */}
        <TreeItem itemId="entities-player" label="🎮 Player">
          {groupedEntities.player_spawn.length === 0 ? (
            <TreeItem
              itemId="entities-player-empty"
              label={
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  No player spawn
                </Typography>
              }
            />
          ) : (
            groupedEntities.player_spawn.map((entity) => (
              <TreeItem
                key={entity.id}
                itemId={entity.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{entity.name}</Typography>
                  </Box>
                }
                onClick={() => handleEntitySelect(entity)}
              />
            ))
          )}
        </TreeItem>

        {/* NPCs */}
        <TreeItem itemId="entities-npcs" label="💬 NPCs">
          {groupedEntities.npc.length === 0 ? (
            <TreeItem
              itemId="entities-npcs-empty"
              label={
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  No NPCs
                </Typography>
              }
            />
          ) : (
            groupedEntities.npc.map((entity) => (
              <TreeItem
                key={entity.id}
                itemId={entity.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Group sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{entity.name}</Typography>
                  </Box>
                }
                onClick={() => handleEntitySelect(entity)}
              />
            ))
          )}
        </TreeItem>

        {/* Interactions */}
        <TreeItem itemId="entities-interactions" label="⚡ Interactions">
          {groupedEntities.interaction.length === 0 ? (
            <TreeItem
              itemId="entities-interactions-empty"
              label={
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  No interactions
                </Typography>
              }
            />
          ) : (
            groupedEntities.interaction.map((entity) => (
              <TreeItem
                key={entity.id}
                itemId={entity.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Dangerous sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{entity.name}</Typography>
                  </Box>
                }
                onClick={() => handleEntitySelect(entity)}
              />
            ))
          )}
        </TreeItem>
      </TreeItem>
    </SimpleTreeView>
  );
};
