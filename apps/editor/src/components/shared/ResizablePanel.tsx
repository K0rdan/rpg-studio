import { useState, useRef, useEffect, ReactNode } from 'react';
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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth =
        position === 'left'
          ? e.clientX
          : window.innerWidth - e.clientX;

      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(constrainedWidth);
      onWidthChange?.(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, position, onWidthChange]);

  return (
    <Box
      ref={panelRef}
      sx={{
        width: `${width}px`,
        position: 'relative',
        borderRight: position === 'left' ? '1px solid' : 'none',
        borderLeft: position === 'right' ? '1px solid' : 'none',
        borderColor: 'divider',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {children}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          top: 0,
          [position]: -2,
          width: '4px',
          height: '100%',
          cursor: 'col-resize',
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
