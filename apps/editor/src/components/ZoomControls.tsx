'use client';

import { Box, Slider, IconButton, Typography, Tooltip } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

interface ZoomControlsProps {
  zoom: number;                    // Current zoom percentage (50-400)
  onZoomChange: (zoom: number) => void;
  min?: number;                    // Default: 50
  max?: number;                    // Default: 400
  step?: number;                   // Default: 50
  showLabel?: boolean;             // Default: true
  compact?: boolean;               // Default: false (for palette)
}

const ZOOM_MARKS = [
  { value: 50, label: '50%' },
  { value: 100, label: '100%' },
  { value: 200, label: '200%' },
  { value: 300, label: '300%' },
  { value: 400, label: '400%' },
];

export default function ZoomControls({
  zoom,
  onZoomChange,
  min = 50,
  max = 400,
  step = 50,
  showLabel = true,
  compact = false,
}: ZoomControlsProps) {
  const handleZoomIn = () => {
    const newZoom = Math.min(max, zoom + step);
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(min, zoom - step);
    onZoomChange(newZoom);
  };

  const handleReset = () => {
    onZoomChange(100);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 0.5 : 1,
        minWidth: compact ? 200 : 300,
      }}
    >
      <Tooltip title="Zoom out (-)">
        <IconButton
          size={compact ? 'small' : 'medium'}
          onClick={handleZoomOut}
          disabled={zoom <= min}
        >
          <ZoomOutIcon fontSize={compact ? 'small' : 'medium'} />
        </IconButton>
      </Tooltip>

      <Slider
        value={zoom}
        onChange={(_, value) => onZoomChange(value as number)}
        min={min}
        max={max}
        step={step}
        marks={compact ? false : ZOOM_MARKS}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => `${value}%`}
        sx={{ flex: 1, mx: 1 }}
      />

      <Tooltip title="Zoom in (+)">
        <IconButton
          size={compact ? 'small' : 'medium'}
          onClick={handleZoomIn}
          disabled={zoom >= max}
        >
          <ZoomInIcon fontSize={compact ? 'small' : 'medium'} />
        </IconButton>
      </Tooltip>

      {showLabel && (
        <Typography
          variant={compact ? 'body2' : 'body1'}
          sx={{ 
            minWidth: compact ? 40 : 50, 
            textAlign: 'center', 
            fontWeight: 'medium',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {zoom}%
        </Typography>
      )}

      <Tooltip title="Reset to 100% (0)">
        <span>
          <IconButton
            size={compact ? 'small' : 'medium'}
            onClick={handleReset}
            disabled={zoom === 100}
            sx={{
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: zoom !== 100 ? 'rotate(180deg)' : 'none',
              },
            }}
          >
            <RestartAltIcon fontSize={compact ? 'small' : 'medium'} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
