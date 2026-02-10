'use client';

import { Entity, EntityType, Sprite } from '@packages/types';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import DeleteIcon from '@mui/icons-material/Delete';
import Chip from '@mui/material/Chip';

interface EntityPropertiesPanelProps {
  entity: Entity | null;
  onUpdateEntity: (entity: Entity) => void;
  onDeleteEntity: () => void;
  availableSprites: Sprite[];
}

export default function EntityPropertiesPanel({
  entity,
  onUpdateEntity,
  onDeleteEntity,
  availableSprites
}: EntityPropertiesPanelProps) {
  if (!entity) {
    return (
      <Paper sx={{ p: 2, mt: 2 }} data-testid="entity-properties-panel">
        <Typography variant="body2" color="text.secondary">
          Select an entity to edit its properties
        </Typography>
      </Paper>
    );
  }

  const handleNameChange = (name: string) => {
    onUpdateEntity({ ...entity, name });
  };

  const handleSpriteChange = (spriteId: string) => {
    if ('spriteId' in entity) {
      onUpdateEntity({ ...entity, spriteId });
    }
  };

  const getEntityTypeLabel = (type: EntityType): string => {
    switch (type) {
      case EntityType.PlayerSpawn:
        return 'Player Spawn';
      case EntityType.NPC:
        return 'NPC';
      case EntityType.Interaction:
        return 'Interaction';
      default:
        return 'Unknown';
    }
  };

  const getEntityTypeColor = (type: EntityType): "success" | "primary" | "warning" => {
    switch (type) {
      case EntityType.PlayerSpawn:
        return 'success';
      case EntityType.NPC:
        return 'primary';
      case EntityType.Interaction:
        return 'warning';
      default:
        return 'primary';
    }
  };

  const needsSprite = entity.type === EntityType.PlayerSpawn || entity.type === EntityType.NPC;

  return (
    <Paper sx={{ p: 2, mt: 2 }} data-testid="entity-properties-panel">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Entity Properties</Typography>
        <Chip 
          label={getEntityTypeLabel(entity.type)} 
          color={getEntityTypeColor(entity.type)}
          size="small"
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Name"
          value={entity.name}
          onChange={(e) => handleNameChange(e.target.value)}
          fullWidth
          size="small"
          data-testid="entity-name-input"
        />

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="X (Tile)"
            value={entity.x}
            disabled
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Y (Tile)"
            value={entity.y}
            disabled
            size="small"
            sx={{ flex: 1 }}
          />
        </Box>

        {needsSprite && (
          <FormControl fullWidth size="small">
            <InputLabel id="entity-sprite-label">Sprite</InputLabel>
            <Select
              labelId="entity-sprite-label"
              value={'spriteId' in entity ? entity.spriteId : ''}
              label="Sprite"
              onChange={(e) => handleSpriteChange(e.target.value)}
              data-testid="entity-sprite-select"
            >
              {availableSprites.map((sprite) => (
                <MenuItem key={sprite.id} value={sprite.id}>
                  {sprite.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={onDeleteEntity}
          fullWidth
          data-testid="entity-delete-button"
        >
          Delete Entity
        </Button>
      </Box>
    </Paper>
  );
}
