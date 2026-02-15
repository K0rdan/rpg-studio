import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Box } from '@mui/material';

interface ResizablePanelProps {
  id: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  position: 'left' | 'right';
  children: ReactNode;
  onWidthChange?: (width: number) => void;
}

export const ResizablePanel = ({
  id,
  defaultWidth,
  minWidth,
  maxWidth,
  position,
  children,
  onWidthChange,
}: ResizablePanelProps) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    e.preventDefault();
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate delta from start position
      const deltaX = e.clientX - startXRef.current;
      
      // Calculate new width based on position
      let newWidth: number;
      if (position === 'left') {
        newWidth = startWidthRef.current + deltaX;
      } else {
        newWidth = startWidthRef.current - deltaX;
      }

      // Constrain width to min/max
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      
      // Only update if width actually changed (avoid unnecessary re-renders)
      if (Math.abs(constrainedWidth - width) > 1) {
        setWidth(constrainedWidth);
        onWidthChange?.(constrainedWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, width, minWidth, maxWidth, position, onWidthChange]);

  // Handle should be on the opposite side of the panel position
  const handleSide = position === 'left' ? 'right' : 'left';

  return (
    <Box
      id={`resizable-panel-${id}`}
      ref={panelRef}
      sx={{
        width: `${width}px`,
        position: 'relative',
        borderRight: position === 'left' ? '1px solid' : 'none',
        borderLeft: position === 'right' ? '1px solid' : 'none',
        borderColor: 'divider',
        height: '100%',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {children}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          top: 0,
          [handleSide]: -2,
          width: '4px',
          height: '100%',
          cursor: 'col-resize',
          zIndex: 10,
          '&:hover': {
            backgroundColor: 'primary.main',
          },
          ...(isResizing && {
            backgroundColor: 'primary.main',
          }),
        }}
      />
    </Box>
  );
};
