import { Box, Typography } from '@mui/material';

export const TilePalette = () => {
  return (
    <Box
      sx={{
        height: 200,
        borderTop: '1px solid',
        borderColor: 'divider',
        p: 2,
        overflow: 'auto',
      }}
    >
      <Typography variant="body2" sx={{ mb: 1 }}>
        TILE PALETTE
      </Typography>
      {/* Tileset selector and tile grid will go here */}
    </Box>
  );
};
