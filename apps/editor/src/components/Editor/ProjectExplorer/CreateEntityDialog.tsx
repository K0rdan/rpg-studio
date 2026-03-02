'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import type { Entity } from '@packages/types';
import { useToast } from '@/context/ToastContext';

interface CreateEntityDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  mapId: string;
  onEntityCreated: (entity: Entity) => void;
}

const ENTITY_TEMPLATES = [
  { value: 'player', label: '🎮 Player', description: 'Player spawn point' },
  { value: 'npc', label: '💬 NPC', description: 'Non-player character' },
  { value: 'interactable', label: '📋 Interactable', description: 'Signs, books, notes' },
  { value: 'container', label: '📦 Container', description: 'Chests, crates' },
  { value: 'teleporter', label: '🌀 Teleporter', description: 'Doors, portals, stairs' },
  { value: 'event_zone', label: '⚡ Event Zone', description: 'Invisible trigger zone' },
] as const;

export const CreateEntityDialog = ({
  open,
  onClose,
  projectId,
  mapId,
  onEntityCreated,
}: CreateEntityDialogProps) => {
  const [entityTemplate, setEntityTemplate] = useState<string>('npc');
  const [entityName, setEntityName] = useState('');
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  const handleCreate = async () => {
    if (!entityName.trim()) {
      showToast('Please enter an entity name', 'error');
      return;
    }

    if (!mapId) {
      showToast('No map selected', 'error');
      return;
    }

    try {
      setCreating(true);

      // Determine entity type based on template
      let entityType: Entity['type'] = 'object';
      if (entityTemplate === 'player') entityType = 'player';
      else if (entityTemplate === 'npc') entityType = 'npc';

      // Create entity with default position (center of map or 0,0)
      const newEntity = {
        name: entityName.trim(),
        type: entityType,
        template: entityTemplate,
        x: 5, // Default position
        y: 5,
        width: 1,
        height: 1,
        direction: 'down' as const,
        commands: [],
      };

      const response = await fetch(`/api/projects/${projectId}/maps/${mapId}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntity),
      });

      if (!response.ok) {
        throw new Error('Failed to create entity');
      }

      const createdEntity = await response.json();
      
      showToast(`Created ${entityTemplate}: ${entityName}`, 'success');
      onEntityCreated(createdEntity);
      
      // Reset form and close
      setEntityName('');
      setEntityTemplate('npc');
      onClose();
    } catch (error) {
      console.error('Error creating entity:', error);
      showToast('Failed to create entity', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setEntityName('');
      setEntityTemplate('npc');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Entity</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="entity-template-label">Entity Template</InputLabel>
            <Select
              labelId="entity-template-label"
              value={entityTemplate}
              label="Entity Template"
              onChange={(e) => setEntityTemplate(e.target.value)}
            >
              {ENTITY_TEMPLATES.map((template) => (
                <MenuItem key={template.value} value={template.value}>
                  <Box>
                    <Typography variant="body1">{template.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {template.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            autoFocus
            label="Entity Name"
            fullWidth
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
            placeholder={`Enter ${entityTemplate} name`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !creating) {
                handleCreate();
              }
            }}
          />

          <Typography variant="caption" color="text.secondary">
            The entity will be placed at position (5, 5). You can move it after creation.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={creating}>
          Cancel
        </Button>
        <Button 
          onClick={handleCreate} 
          variant="contained" 
          disabled={creating || !entityName.trim()}
        >
          {creating ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
