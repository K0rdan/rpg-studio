'use client';

import { Box, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import ColorizeIcon from '@mui/icons-material/Colorize';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonPinCircleIcon from '@mui/icons-material/PersonPinCircle';
import { DrawingTool, TOOL_LABELS, TOOL_SHORTCUTS } from '@/types/DrawingTool';

interface ToolSelectorProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
}

const TOOL_ICONS = {
  [DrawingTool.PENCIL]: EditIcon,
  [DrawingTool.RECTANGLE]: CropSquareIcon,
  [DrawingTool.FILL]: FormatColorFillIcon,
  [DrawingTool.EYEDROPPER]: ColorizeIcon,
  [DrawingTool.ERASER]: DeleteOutlineIcon,
  [DrawingTool.ENTITY]: PersonPinCircleIcon,
};

export default function ToolSelector({ activeTool, onToolChange }: ToolSelectorProps) {
  const handleChange = (_event: React.MouseEvent<HTMLElement>, newTool: DrawingTool | null) => {
    if (newTool !== null) {
      onToolChange(newTool);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-testid="tool-selector">
      <ToggleButtonGroup
        value={activeTool}
        exclusive
        onChange={handleChange}
        size="small"
        aria-label="drawing tools"
        data-testid="tool-button-group"
      >
        {Object.values(DrawingTool).map((tool) => {
          const Icon = TOOL_ICONS[tool];
          const label = TOOL_LABELS[tool];
          const shortcut = TOOL_SHORTCUTS[tool];
          
          return (
            <ToggleButton
              key={tool}
              value={tool}
              aria-label={label}
              data-testid={`tool-button-${tool}`}
            >
              <Tooltip title={`${label} (${shortcut})`} arrow>
                <Icon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </Box>
  );
}
