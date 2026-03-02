import { useEffect } from 'react';
import { Entity } from '@packages/types';
import { useEntityDataStore } from '../stores/entityDataStore';

// Stable reference for empty state — prevents useSyncExternalStore infinite loop
// when returning `|| []` inside a Zustand selector (new reference each render).
const EMPTY_ENTITIES: Entity[] = [];

export function useEntities(projectId: string | null, mapId: string | null) {
  const getKey = useEntityDataStore((state) => state.getKey);
  const key = projectId && mapId ? getKey(projectId, mapId) : '';

  const entities = useEntityDataStore((state) => key ? (state.entitiesByMap[key] ?? EMPTY_ENTITIES) : EMPTY_ENTITIES);
  const isLoading = useEntityDataStore((state) => key ? (state.loadingByMap[key] || false) : false);
  const error = useEntityDataStore((state) => key ? (state.errorByMap[key] || null) : null);
  
  const fetchEntities = useEntityDataStore((state) => state.fetchEntities);
  const storeAddEntity = useEntityDataStore((state) => state.addEntity);
  const storeUpdateEntity = useEntityDataStore((state) => state.updateEntity);
  const storeDeleteEntity = useEntityDataStore((state) => state.deleteEntity);
  const storeMutate = useEntityDataStore((state) => state.mutate);

  useEffect(() => {
    if (projectId && mapId) {
      fetchEntities(projectId, mapId);
    }
  }, [projectId, mapId, fetchEntities]);

  return {
    entities,
    isLoading,
    error,
    addEntity: async (entity: Omit<Entity, 'id'> & { id?: string }) => {
      if (projectId && mapId) return storeAddEntity(projectId, mapId, entity);
    },
    updateEntity: async (entityId: string, updatedEntity: Entity) => {
      if (projectId && mapId) return storeUpdateEntity(projectId, mapId, entityId, updatedEntity);
    },
    deleteEntity: async (entityId: string) => {
      if (projectId && mapId) return storeDeleteEntity(projectId, mapId, entityId);
    },
    mutate: async () => {
      if (projectId && mapId) return storeMutate(projectId, mapId);
    },
  };
}
