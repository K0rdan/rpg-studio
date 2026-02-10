import { useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';

export const useKeyboardShortcuts = () => {
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      
      // Tool shortcuts
      switch (key) {
        case 'b':
          setActiveTool('brush');
          e.preventDefault();
          break;
        case 'f':
          setActiveTool('fill');
          e.preventDefault();
          break;
        case 'e':
          setActiveTool('eraser');
          e.preventDefault();
          break;
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            setActiveTool('select');
            e.preventDefault();
          }
          break;
        case 'v':
          setActiveTool('entity');
          e.preventDefault();
          break;
        case 'r':
          if (!e.ctrlKey && !e.metaKey) {
            setActiveTool('region');
            e.preventDefault();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool]);
};
