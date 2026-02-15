import { Box, Typography } from '@mui/material';

export const EmptyState = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'text.secondary',
        p: 3,
      }}
    >
      <Typography variant="body2" align="center">
        Select an item from the project tree
        <br />
        to view details and tools
      </Typography>
    </Box>
  );
};
