'use client';

import { useState } from 'react';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Divider, Button } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { Entity, Command, CommandType, TriggerType, ShowMessageCommand, TeleportPlayerCommand, GiveItemCommand } from '@packages/types';
import { CommandList } from './CommandList';
import { AddCommandDialog } from './AddCommandDialog';
import { EditShowMessageDialog } from './EditShowMessageDialog';
import { EditTeleportPlayerDialog } from './EditTeleportPlayerDialog';
import { EditGiveItemDialog } from './EditGiveItemDialog';

interface EntityPropertiesProps {
  entity: Entity | null;
  onUpdateEntity: (entity: Entity) => void;
  onDeleteEntity?: (entity: Entity) => void;
}

export const EntityProperties = ({ entity, onUpdateEntity, onDeleteEntity }: EntityPropertiesProps) => {
  const [addCommandDialogOpen, setAddCommandDialogOpen] = useState(false);
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null);
  const [editingCommandType, setEditingCommandType] = useState<CommandType | null>(null);

  if (!entity) {
    return (
      <Box sx={{ p: 2, color: '#888', textAlign: 'center' }}>
        <Typography variant="body2">No entity selected</Typography>
        <Typography variant="caption">Click on an entity to edit its properties</Typography>
      </Box>
    );
  }

  const handleUpdateField = (field: keyof Entity, value: any) => {
    onUpdateEntity({ ...entity, [field]: value });
  };

  const handleAddCommand = () => {
    setAddCommandDialogOpen(true);
  };

  const handleSelectCommandType = (type: CommandType) => {
    setEditingCommandType(type);
    setEditingCommandIndex(null); // null means adding new
  };

  const handleEditCommand = (index: number) => {
    const command = entity.commands[index];
    setEditingCommandType(command.type);
    setEditingCommandIndex(index);
  };

  const handleDeleteCommand = (index: number) => {
    const newCommands = entity.commands.filter((_, i) => i !== index);
    handleUpdateField('commands', newCommands);
  };

  const handleSaveShowMessage = (command: ShowMessageCommand) => {
    const newCommands = [...entity.commands];
    if (editingCommandIndex !== null) {
      newCommands[editingCommandIndex] = command;
    } else {
      newCommands.push(command);
    }
    handleUpdateField('commands', newCommands);
    setEditingCommandType(null);
    setEditingCommandIndex(null);
  };

  const handleSaveTeleportPlayer = (command: TeleportPlayerCommand) => {
    const newCommands = [...entity.commands];
    if (editingCommandIndex !== null) {
      newCommands[editingCommandIndex] = command;
    } else {
      newCommands.push(command);
    }
    handleUpdateField('commands', newCommands);
    setEditingCommandType(null);
    setEditingCommandIndex(null);
  };

  const handleSaveGiveItem = (command: GiveItemCommand) => {
    const newCommands = [...entity.commands];
    if (editingCommandIndex !== null) {
      newCommands[editingCommandIndex] = command;
    } else {
      newCommands.push(command);
    }
    handleUpdateField('commands', newCommands);
    setEditingCommandType(null);
    setEditingCommandIndex(null);
  };

  const handleCloseCommandDialog = () => {
    setEditingCommandType(null);
    setEditingCommandIndex(null);
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      {/* Entity Name */}
      <TextField
        label="Entity Name"
        value={entity.name}
        onChange={(e) => handleUpdateField('name', e.target.value)}
        fullWidth
        margin="normal"
        sx={{
          '& .MuiOutlinedInput-root': {
            color: '#fff',
            '& fieldset': { borderColor: '#444' },
            '&:hover fieldset': { borderColor: '#666' },
            '&.Mui-focused fieldset': { borderColor: '#2196F3' },
          },
          '& .MuiInputLabel-root': { color: '#aaa' },
        }}
      />

      {/* Position */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <TextField
          label="X"
          type="number"
          value={entity.x}
          onChange={(e) => handleUpdateField('x', parseInt(e.target.value) || 0)}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: '#444' },
              '&:hover fieldset': { borderColor: '#666' },
              '&.Mui-focused fieldset': { borderColor: '#2196F3' },
            },
            '& .MuiInputLabel-root': { color: '#aaa' },
          }}
        />
        <TextField
          label="Y"
          type="number"
          value={entity.y}
          onChange={(e) => handleUpdateField('y', parseInt(e.target.value) || 0)}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: '#444' },
              '&:hover fieldset': { borderColor: '#666' },
              '&.Mui-focused fieldset': { borderColor: '#2196F3' },
            },
            '& .MuiInputLabel-root': { color: '#aaa' },
          }}
        />
      </Box>

      {/* Trigger */}
      <FormControl
        fullWidth
        margin="normal"
        sx={{
          '& .MuiOutlinedInput-root': {
            color: '#fff',
            '& fieldset': { borderColor: '#444' },
            '&:hover fieldset': { borderColor: '#666' },
            '&.Mui-focused fieldset': { borderColor: '#2196F3' },
          },
          '& .MuiInputLabel-root': { color: '#aaa' },
        }}
      >
        <InputLabel>Trigger</InputLabel>
        <Select value={entity.trigger} onChange={(e) => handleUpdateField('trigger', e.target.value)} label="Trigger">
          <MenuItem value={TriggerType.ActionButton}>Action Button (Space/Enter)</MenuItem>
          <MenuItem value={TriggerType.PlayerTouch}>Player Touch</MenuItem>
          <MenuItem value={TriggerType.Autorun}>Autorun</MenuItem>
          <MenuItem value={TriggerType.MapLoad}>Map Load</MenuItem>
        </Select>
      </FormControl>

      <Divider sx={{ my: 3, borderColor: '#444' }} />

      {/* Commands */}
      <CommandList
        commands={entity.commands}
        onAddCommand={handleAddCommand}
        onEditCommand={handleEditCommand}
        onDeleteCommand={handleDeleteCommand}
      />

      {/* Dialogs */}
      <AddCommandDialog
        open={addCommandDialogOpen}
        onClose={() => setAddCommandDialogOpen(false)}
        onSelectCommandType={handleSelectCommandType}
      />

      <EditShowMessageDialog
        open={editingCommandType === CommandType.ShowMessage}
        command={
          editingCommandIndex !== null && entity.commands[editingCommandIndex]?.type === CommandType.ShowMessage
            ? (entity.commands[editingCommandIndex] as ShowMessageCommand)
            : null
        }
        onClose={handleCloseCommandDialog}
        onSave={handleSaveShowMessage}
      />

      <EditTeleportPlayerDialog
        open={editingCommandType === CommandType.TeleportPlayer}
        command={
          editingCommandIndex !== null && entity.commands[editingCommandIndex]?.type === CommandType.TeleportPlayer
            ? (entity.commands[editingCommandIndex] as TeleportPlayerCommand)
            : null
        }
        onClose={handleCloseCommandDialog}
        onSave={handleSaveTeleportPlayer}
      />

      <EditGiveItemDialog
        open={editingCommandType === CommandType.GiveItem}
        command={
          editingCommandIndex !== null && entity.commands[editingCommandIndex]?.type === CommandType.GiveItem
            ? (entity.commands[editingCommandIndex] as GiveItemCommand)
            : null
        }
        onClose={handleCloseCommandDialog}
        onSave={handleSaveGiveItem}
      />

      {/* Delete Entity Button */}
      {onDeleteEntity && (
        <>
          <Divider sx={{ my: 3, borderColor: '#444' }} />
          <Button
            variant="outlined"
            color="error"
            fullWidth
            startIcon={<Delete />}
            onClick={() => onDeleteEntity(entity)}
            sx={{ mt: 1 }}
          >
            Delete Entity
          </Button>
        </>
      )}
    </Box>
  );
};
