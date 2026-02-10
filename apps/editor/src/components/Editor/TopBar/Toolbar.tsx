import { AppBar, Toolbar as MuiToolbar, IconButton, Tooltip, Divider, Box } from '@mui/material';
import {
  Brush,
  FormatColorFill,
  Delete,
  SelectAll,
  Person,
  GridOn,
} from '@mui/icons-material';
import { useEditorStore } from '@/stores/editorStore';

export const Toolbar = () => {
  const activeTool = useEditorStore((state) => state.tools.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  const tools = [
    { id: 'brush' as const, icon: <Brush />, label: 'Brush Tool (B)' },
    { id: 'fill' as const, icon: <FormatColorFill />, label: 'Fill Tool (F)' },
    { id: 'eraser' as const, icon: <Delete />, label: 'Eraser Tool (E)' },
    { id: 'select' as const, icon: <SelectAll />, label: 'Select Tool (S)' },
    { id: 'entity' as const, icon: <Person />, label: 'Entity Tool (V)' },
    { id: 'region' as const, icon: <GridOn />, label: 'Region Tool (R)' },
  ];

  return (
    <AppBar position="static" color="default" elevation={0}>
      <MuiToolbar variant="dense" sx={{ gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {tools.map((tool) => (
            <Tooltip key={tool.id} title={tool.label}>
              <IconButton
                size="small"
                color={activeTool === tool.id ? 'primary' : 'default'}
                onClick={() => setActiveTool(tool.id)}
              >
                {tool.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        {/* Tool options will go here */}
        {activeTool === 'brush' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Brush size slider will go here */}
          </Box>
        )}
      </MuiToolbar>
    </AppBar>
  );
};
