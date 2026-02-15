import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Add, Remove, FitScreen, RestartAlt } from '@mui/icons-material';
import { useViewportStore } from '@/stores/viewportStore';

export const CanvasControls = () => {
  const zoom = useViewportStore((state) => state.zoom);
  const zoomIn = useViewportStore((state) => state.zoomIn);
  const zoomOut = useViewportStore((state) => state.zoomOut);
  const resetZoom = useViewportStore((state) => state.resetZoom);
  const resetViewport = useViewportStore((state) => state.resetViewport);

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        bgcolor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 1,
        p: 1,
        zIndex: 10,
      }}
    >
      {/* Zoom In */}
      <Tooltip title="Zoom In (+)" placement="left">
        <IconButton
          size="small"
          onClick={zoomIn}
          sx={{ color: 'white' }}
        >
          <Add />
        </IconButton>
      </Tooltip>

      {/* Current Zoom Level */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 40,
          py: 0.5,
        }}
      >
        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
          {zoom}x
        </Typography>
      </Box>

      {/* Zoom Out */}
      <Tooltip title="Zoom Out (-)" placement="left">
        <IconButton
          size="small"
          onClick={zoomOut}
          sx={{ color: 'white' }}
        >
          <Remove />
        </IconButton>
      </Tooltip>

      {/* Reset Zoom */}
      <Tooltip title="Reset Zoom (0)" placement="left">
        <IconButton
          size="small"
          onClick={resetZoom}
          sx={{ color: 'white' }}
        >
          <FitScreen />
        </IconButton>
      </Tooltip>

      {/* Reset Viewport */}
      <Tooltip title="Reset Viewport (Home)" placement="left">
        <IconButton
          size="small"
          onClick={resetViewport}
          sx={{ color: 'white' }}
        >
          <RestartAlt />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
