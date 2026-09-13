'use client';

import { Box, Typography } from '@mui/material';
import { useSelectionStore } from '@/stores/selectionStore';
import { useEntitySelectionStore } from '@/stores/entitySelectionStore';
import { useMapStore } from '@/stores/mapStore';
import { useEntities } from '@/hooks/useEntities';
import { useParams } from 'next/navigation';
import { MapProperties } from '../ContextPanel/MapProperties';
import { EntityProperties } from '../EntityProperties';
import { CharsetInspector } from './CharsetInspector';
import { TilesetInspector } from './TilesetInspector';
import type { Sprite, Tileset } from '@packages/types';

export const Inspector = () => {
  const params = useParams();
  const projectId = params?.projectId as string;

  const selectedType = useSelectionStore((state) => state.type);
  const selectedId = useSelectionStore((state) => state.id);
  const selectedData = useSelectionStore((state) => state.data);
  const selectedEntityId = useEntitySelectionStore((state) => state.selectedEntityId);
  const activeMapId = useMapStore((state) => state.activeMapId);

  const { entities, updateEntity, deleteEntity } = useEntities(projectId, activeMapId);
  const selectedEntity = selectedEntityId
    ? entities.find((e) => e.id === selectedEntityId) ?? null
    : null;

  const handleUpdateEntity = async (entity: typeof selectedEntity) => {
    if (!entity) return;
    try { await updateEntity(entity.id, entity); }
    catch (error) { console.error('Failed to update entity:', error); }
  };

  // Map selected → show editable map properties + tileset preview
  if (selectedType === 'map' && selectedId) {
    return <MapProperties mapId={selectedId} />;
  }

  if (selectedType === 'tileset' && selectedId && selectedData) {
    return <TilesetInspector projectId={projectId} tileset={selectedData as Tileset} />;
  }

  if (selectedType === 'charset' && selectedId && selectedData) {
    return <CharsetInspector projectId={projectId} sprite={selectedData as Sprite} />;
  }

  // Entity selected → show entity properties
  if (selectedEntityId && selectedEntity) {
    return (
      <EntityProperties
        entity={selectedEntity}
        onUpdateEntity={handleUpdateEntity}
        onDeleteEntity={() => {
          deleteEntity(selectedEntityId).catch(console.error);
        }}
      />
    );
  }

  // No selection
  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: '#161616' }}>
      <Typography variant="overline" sx={{ color: '#555', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.1em' }}>
        Inspector
      </Typography>
      <Typography variant="body2" sx={{ color: '#444', mt: 2, fontSize: '0.75rem' }}>
        Select a map, entity, or asset to inspect its properties.
      </Typography>
    </Box>
  );
};
