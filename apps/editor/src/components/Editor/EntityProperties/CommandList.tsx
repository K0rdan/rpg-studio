'use client';

import { Box, Typography, Button, IconButton, Paper } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { Command, CommandType } from '@packages/types';

interface CommandListProps {
  commands: Command[];
  onAddCommand: () => void;
  onEditCommand: (index: number) => void;
  onDeleteCommand: (index: number) => void;
}

export const CommandList = ({ commands, onAddCommand, onEditCommand, onDeleteCommand }: CommandListProps) => {
  const getCommandPreview = (command: Command): string => {
    switch (command.type) {
      case CommandType.ShowMessage:
        return command.parameters.text;
      case CommandType.TeleportPlayer:
        const mapName = command.parameters.mapId || 'Same Map';
        return `→ ${mapName} (${command.parameters.x}, ${command.parameters.y})`;
      case CommandType.GiveItem:
        return `${command.parameters.itemId} × ${command.parameters.quantity}`;
      default:
        return 'Unknown command';
    }
  };

  const getCommandLabel = (command: Command): string => {
    switch (command.type) {
      case CommandType.ShowMessage:
        return 'Show Message';
      case CommandType.TeleportPlayer:
        return 'Teleport Player';
      case CommandType.GiveItem:
        return 'Give Item';
      default:
        return 'Unknown';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff' }}>
          COMMANDS
        </Typography>
        <IconButton
          size="small"
          onClick={onAddCommand}
          sx={{
            bgcolor: '#2196F3',
            color: '#fff',
            '&:hover': { bgcolor: '#1976D2' },
            width: 24,
            height: 24,
          }}
        >
          <AddIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Command List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {commands.length === 0 ? (
          <Typography variant="caption" sx={{ color: '#888', textAlign: 'center', py: 2 }}>
            No commands. Click + to add one.
          </Typography>
        ) : (
          commands.map((command, index) => (
            <Paper
              key={index}
              sx={{
                p: 1.5,
                bgcolor: '#2d2d2d',
                border: '1px solid #444',
                borderRadius: 1,
              }}
            >
              {/* Command Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
                  {index + 1}. {getCommandLabel(command)}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onDeleteCommand(index)}
                  sx={{
                    color: '#f44336',
                    padding: 0,
                    '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.1)' },
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>

              {/* Command Preview */}
              <Typography
                variant="caption"
                sx={{
                  color: '#aaa',
                  display: 'block',
                  mb: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {getCommandPreview(command)}
              </Typography>

              {/* Edit Button */}
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => onEditCommand(index)}
                sx={{
                  color: '#aaa',
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  '&:hover': { color: '#fff', bgcolor: 'rgba(255, 255, 255, 0.05)' },
                }}
              >
                Edit
              </Button>
            </Paper>
          ))
        )}
      </Box>
    </Box>
  );
};
