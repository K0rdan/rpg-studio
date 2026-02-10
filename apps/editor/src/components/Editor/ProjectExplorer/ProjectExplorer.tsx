'use client';

import { Box, Typography, Divider } from '@mui/material';
import { MapsTree } from './MapsTree';
import { EntitiesTree } from './EntitiesTree';
import { AssetsTree } from './AssetsTree';

export const ProjectExplorer = () => {
  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ mb: 2, fontSize: '0.875rem', fontWeight: 600 }}>
        PROJECT EXPLORER
      </Typography>
      
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <MapsTree />
        <Divider />
        <EntitiesTree />
        <Divider />
        <AssetsTree />
      </Box>
    </Box>
  );
};
