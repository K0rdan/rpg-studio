import { create } from 'zustand';
import { Entity } from '@packages/types';

interface EntityDataState {
  entitiesByMap: Record<string, Entity[]>;
  loadingByMap: Record<string, boolean>;
  errorByMap: Record<string, Error | null>;
  
  // Cache key generator
  getKey: (projectId: string, mapId: string) => string;
  
  // Fetching
  fetchEntities: (projectId: string, mapId: string, force?: boolean) => Promise<void>;
  
  // Mutations
  addEntity: (projectId: string, mapId: string, entity: Omit<Entity, 'id'> & { id?: string }) => Promise<void>;
  updateEntity: (projectId: string, mapId: string, entityId: string, updatedEntity: Entity) => Promise<void>;
  deleteEntity: (projectId: string, mapId: string, entityId: string) => Promise<void>;
  
  // Manual revalidation
  mutate: (projectId: string, mapId: string) => Promise<void>;
}

export const useEntityDataStore = create<EntityDataState>((set, get) => ({
  entitiesByMap: {},
  loadingByMap: {},
  errorByMap: {},
  
  getKey: (projectId: string, mapId: string) => `${projectId}_${mapId}`,
  
  fetchEntities: async (projectId: string, mapId: string, force = false) => {
    if (!projectId || !mapId) return;
    const key = get().getKey(projectId, mapId);
    
    // Deduplicate or use cache
    if (!force && (get().loadingByMap[key] || get().entitiesByMap[key])) {
      return;
    }
    
    set((state) => ({
      loadingByMap: { ...state.loadingByMap, [key]: true },
      errorByMap: { ...state.errorByMap, [key]: null }
    }));
    
    try {
      const url = `/api/projects/${projectId}/maps/${mapId}/entities`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to load entities');
      }
      
      const data = await response.json();
      
      set((state) => ({
        entitiesByMap: { ...state.entitiesByMap, [key]: data },
        loadingByMap: { ...state.loadingByMap, [key]: false }
      }));
    } catch (error) {
      set((state) => ({
        loadingByMap: { ...state.loadingByMap, [key]: false },
        errorByMap: { ...state.errorByMap, [key]: error as Error }
      }));
    }
  },
  
  mutate: async (projectId: string, mapId: string) => {
    return get().fetchEntities(projectId, mapId, true);
  },
  
  addEntity: async (projectId: string, mapId: string, entity: Omit<Entity, 'id'> & { id?: string }) => {
    const key = get().getKey(projectId, mapId);
    const url = `/api/projects/${projectId}/maps/${mapId}/entities`;
    
    // Save current state for rollback
    const previousEntities = get().entitiesByMap[key] || [];
    
    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticEntity = { ...entity, id: entity.id || tempId } as Entity;
    
    set((state) => ({
      entitiesByMap: {
        ...state.entitiesByMap,
        [key]: [...previousEntities, optimisticEntity]
      }
    }));
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity),
      });

      if (!response.ok) throw new Error('Failed to add entity');

      // Revalidate to get real ID
      await get().mutate(projectId, mapId);
    } catch (error) {
      // Rollback
      set((state) => ({
        entitiesByMap: { ...state.entitiesByMap, [key]: previousEntities }
      }));
      throw error;
    }
  },
  
  updateEntity: async (projectId: string, mapId: string, entityId: string, updatedEntity: Entity) => {
    const key = get().getKey(projectId, mapId);
    const url = `/api/projects/${projectId}/maps/${mapId}/entities/${entityId}`;
    
    const previousEntities = get().entitiesByMap[key] || [];
    
    // Optimistic update
    set((state) => ({
      entitiesByMap: {
        ...state.entitiesByMap,
        [key]: previousEntities.map(e => e.id === entityId ? updatedEntity : e)
      }
    }));
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEntity),
      });

      if (!response.ok) throw new Error('Failed to update entity');

      // Revalidate
      await get().mutate(projectId, mapId);
    } catch (error) {
      // Rollback
      set((state) => ({
        entitiesByMap: { ...state.entitiesByMap, [key]: previousEntities }
      }));
      throw error;
    }
  },
  
  deleteEntity: async (projectId: string, mapId: string, entityId: string) => {
    const key = get().getKey(projectId, mapId);
    const url = `/api/projects/${projectId}/maps/${mapId}/entities/${entityId}`;
    
    const previousEntities = get().entitiesByMap[key] || [];
    
    // Optimistic update
    set((state) => ({
      entitiesByMap: {
        ...state.entitiesByMap,
        [key]: previousEntities.filter(e => e.id !== entityId)
      }
    }));
    
    try {
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) throw new Error('Failed to delete entity');

      // Revalidate
      await get().mutate(projectId, mapId);
    } catch (error) {
      // Rollback
      set((state) => ({
        entitiesByMap: { ...state.entitiesByMap, [key]: previousEntities }
      }));
      throw error;
    }
  }
}));
