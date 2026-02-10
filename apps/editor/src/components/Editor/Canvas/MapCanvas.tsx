import { Box } from '@mui/material';

export const MapCanvas = () => {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#1E1E1E',
        position: 'relative',
      }}
    >
      <canvas
        style={{
          border: '1px solid #444',
          imageRendering: 'pixelated',
        }}
      />
    </Box>
  );
};
