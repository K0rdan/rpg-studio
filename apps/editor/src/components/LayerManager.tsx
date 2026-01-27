'use client';

import { Layer } from '@packages/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

interface LayerManagerProps {
  layers: Layer[];
  activeLayerIndex: number;
  onSelectLayer: (index: number) => void;
  onAddLayer: () => void;
  onRemoveLayer: (index: number) => void;
}

export default function LayerManager({ 
  layers, 
  activeLayerIndex, 
  onSelectLayer, 
  onAddLayer, 
  onRemoveLayer 
}: LayerManagerProps) {
  return (
    <Paper sx={{ p: 2, mb: 2, maxHeight: 300, overflow: 'auto' }} data-testid="layer-manager">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Layers</Typography>
        <IconButton 
          onClick={onAddLayer} 
          size="small" 
          color="primary" 
          sx={{ border: '1px solid', borderRadius: 1 }}
          data-testid="add-layer-button"
        >
          <AddIcon />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }} data-testid="layer-list">
        {layers.slice().reverse().map((layer, i) => {
          const index = layers.length - 1 - i;
          const isActive = activeLayerIndex === index;
          
          return (
            <Paper 
              key={index}
              elevation={isActive ? 3 : 1}
              sx={{ 
                p: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                border: isActive ? '2px solid #1976d2' : '1px solid transparent',
                bgcolor: isActive ? 'action.selected' : 'background.paper',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => onSelectLayer(index)}
              data-testid={`layer-item-${index}`}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box 
                  sx={{ 
                    width: 24, 
                    height: 24, 
                    bgcolor: '#eee', 
                    borderRadius: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    color: '#888'
                  }}
                >
                  {index + 1}
                </Box>
                <Typography variant="body2" fontWeight={isActive ? 'bold' : 'normal'}>
                  {layer.name}
                </Typography>
              </Box>
              
              {layers.length > 1 && (
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveLayer(index);
                  }}
                  sx={{ opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
                  data-testid={`delete-layer-button-${index}`}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Paper>
          );
        })}
      </Box>
    </Paper>
  );
}
