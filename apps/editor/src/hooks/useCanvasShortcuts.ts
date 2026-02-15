import { useEffect } from 'react';
import { useViewportStore } from '@/stores/viewportStore';

/**
 * Hook to handle keyboard shortcuts for canvas zoom and pan
 */
export function useCanvasShortcuts() {
  const zoomIn = useViewportStore((state) => state.zoomIn);
  const zoomOut = useViewportStore((state) => state.zoomOut);
  const resetZoom = useViewportStore((state) => state.resetZoom);
  const resetViewport = useViewportStore((state) => state.resetViewport);
  const pan = useViewportStore((state) => state.pan);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Zoom shortcuts
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
      
      // Reset viewport
      else if (e.key === 'Home') {
        e.preventDefault();
        resetViewport();
      }
      
      // Pan with arrow keys
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        pan(0, 20);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        pan(0, -20);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        pan(20, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        pan(-20, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom, resetViewport, pan]);
}
