import { useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';

const STORAGE_KEY = 'rpg-studio-layout';

export const useLayoutPersistence = () => {
  const layout = useEditorStore((state) => state.layout);
  const setLeftSidebarWidth = useEditorStore((state) => state.setLeftSidebarWidth);
  const setRightSidebarWidth = useEditorStore((state) => state.setRightSidebarWidth);
  const setTilePaletteHeight = useEditorStore((state) => state.setTilePaletteHeight);

  // Load layout from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.leftSidebarWidth) setLeftSidebarWidth(parsed.leftSidebarWidth);
        if (parsed.rightSidebarWidth) setRightSidebarWidth(parsed.rightSidebarWidth);
        if (parsed.tilePaletteHeight) setTilePaletteHeight(parsed.tilePaletteHeight);
      }
    } catch (error) {
      console.error('Failed to load layout preferences:', error);
    }
  }, [setLeftSidebarWidth, setRightSidebarWidth, setTilePaletteHeight]);

  // Save layout to localStorage on change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
      } catch (error) {
        console.error('Failed to save layout preferences:', error);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [layout]);
};
