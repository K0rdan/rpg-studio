import { Box, CircularProgress, Typography } from '@mui/material';

export const CanvasLoading = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        height: '100%',
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="body1" color="text.secondary">
        Loading map...
      </Typography>
    </Box>
  );
};
