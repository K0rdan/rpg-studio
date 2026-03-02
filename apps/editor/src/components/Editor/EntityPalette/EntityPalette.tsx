'use client';

import { Box, Typography, Button } from '@mui/material';
import { useEntitySelectionStore } from '@/stores/entitySelectionStore';
import { ENTITY_TEMPLATES } from '@/constants/entityTemplates';
import * as Icons from '@mui/icons-material';

export const EntityPalette = () => {
  const selectedTemplateId = useEntitySelectionStore((state) => state.selectedTemplateId);
  const setSelectedTemplate = useEntitySelectionStore((state) => state.setSelectedTemplate);

  return (
    <Box
      id="entity-palette"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#1e1e1e',
        color: '#fff',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff' }}>
          Entity Palette
        </Typography>
        <Typography variant="caption" sx={{ color: '#888' }}>
          Select a template to place
        </Typography>
      </Box>

      {/* Entity Template Grid */}
      <Box
        sx={{
          p: 2,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1.5,
        }}
      >
        {ENTITY_TEMPLATES.map((template) => {
          // Dynamically get icon component
          const IconComponent = (Icons as any)[template.icon] || Icons.Help;
          
          return (
            <Button
              key={template.id}
              data-testid={`entity-template-${template.id}`}
              onClick={() => setSelectedTemplate(template.id)}
              sx={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                bgcolor: selectedTemplateId === template.id ? template.color : '#2d2d2d',
                color: selectedTemplateId === template.id ? '#fff' : '#aaa',
                border: '1px solid',
                borderColor: selectedTemplateId === template.id ? template.color : '#444',
                '&:hover': {
                  bgcolor: selectedTemplateId === template.id ? template.color : '#3d3d3d',
                  borderColor: template.color,
                },
                transition: 'all 0.2s',
              }}
            >
              <IconComponent sx={{ fontSize: 32 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {template.label}
              </Typography>
            </Button>
          );
        })}
      </Box>

      {/* Instructions */}
      <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid #333' }}>
        <Typography variant="caption" sx={{ color: '#888' }}>
          {selectedTemplateId
            ? 'Click on the canvas to place the entity'
            : 'Select a template above'}
        </Typography>
      </Box>
    </Box>
  );
};
