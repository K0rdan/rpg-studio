import { create } from 'zustand';

interface EntitySelectionState {
  selectedTemplateId: string | null;
  selectedEntityId: string | null;
  setSelectedTemplate: (templateId: string | null) => void;
  setSelectedEntity: (entityId: string | null) => void;
  clearSelection: () => void;
}

export const useEntitySelectionStore = create<EntitySelectionState>((set) => ({
  selectedTemplateId: null,
  selectedEntityId: null,
  setSelectedTemplate: (templateId) => set({ selectedTemplateId: templateId }),
  setSelectedEntity: (entityId) => set({ selectedEntityId: entityId }),
  clearSelection: () => set({ selectedTemplateId: null, selectedEntityId: null }),
}));
