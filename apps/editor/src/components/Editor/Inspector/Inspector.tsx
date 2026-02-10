import { Box, Typography } from '@mui/material';
import { useSelectionStore } from '@/stores/selectionStore';

export const Inspector = () => {
  const selection = useSelectionStore((state) => state.type);

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2, fontSize: '0.875rem', fontWeight: 600 }}>
        ⚙ INSPECTOR
      </Typography>
      
      {!selection && (
        <Typography variant="body2" color="text.secondary">
          No selection
        </Typography>
      )}
      
      {/* Map, Entity, and Tile inspectors will go here */}
    </Box>
  );
};
