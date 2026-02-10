import { create } from 'zustand';

export type SelectionType = 'map' | 'entity' | 'tile' | 'tileset' | 'charset' | 'sound' | null;

interface SelectionState {
  type: SelectionType;
  id: string | null;
  data: any;
  
  setSelection: (type: SelectionType, id: string | null, data: any) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  type: null,
  id: null,
  data: null,
  
  setSelection: (type, id, data) =>
    set({ type, id, data }),
  
  clearSelection: () =>
    set({ type: null, id: null, data: null }),
}));
