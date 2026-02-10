'use client';

import { useState } from 'react';
import { EntityType, Sprite } from '@packages/types';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import PlaceIcon from '@mui/icons-material/Place';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

interface EntityPaletteProps {
  selectedEntityType: EntityType | null;
  onSelectEntityType: (type: EntityType | null) => void;
  selectedSpriteId: string | null;
  onSelectSprite: (spriteId: string | null) => void;
  availableSprites: Sprite[];
}

export default function EntityPalette({
  selectedEntityType,
  onSelectEntityType,
  selectedSpriteId,
  onSelectSprite,
  availableSprites
}: EntityPaletteProps) {
  const handleEntityTypeChange = (_event: React.MouseEvent<HTMLElement>, newType: EntityType | null) => {
    onSelectEntityType(newType);
    
    // Reset sprite selection when changing entity type
    if (newType === EntityType.Interaction) {
      onSelectSprite(null);
    }
  };

  const needsSprite = selectedEntityType === EntityType.PlayerSpawn || selectedEntityType === EntityType.NPC;

  return (
    <Paper sx={{ p: 2, mt: 2 }} data-testid="entity-palette">
      <Typography variant="h6" sx={{ mb: 2 }}>Entity Palette</Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>Entity Type</Typography>
        <ToggleButtonGroup
          value={selectedEntityType}
          exclusive
          onChange={handleEntityTypeChange}
          aria-label="entity type"
          fullWidth
          orientation="vertical"
        >
          <ToggleButton 
            value={EntityType.PlayerSpawn} 
            aria-label="player spawn"
            data-testid="entity-type-player-spawn"
          >
            <PersonIcon sx={{ mr: 1 }} />
            Player Spawn
          </ToggleButton>
          <ToggleButton 
            value={EntityType.NPC} 
            aria-label="npc"
            data-testid="entity-type-npc"
          >
            <GroupIcon sx={{ mr: 1 }} />
            NPC
          </ToggleButton>
          <ToggleButton 
            value={EntityType.Interaction} 
            aria-label="interaction"
            data-testid="entity-type-interaction"
          >
            <PlaceIcon sx={{ mr: 1 }} />
            Interaction
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {needsSprite && (
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="sprite-select-label">Sprite</InputLabel>
          <Select
            labelId="sprite-select-label"
            value={selectedSpriteId || ''}
            label="Sprite"
            onChange={(e) => onSelectSprite(e.target.value || null)}
            data-testid="entity-sprite-select"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {availableSprites.map((sprite) => (
              <MenuItem key={sprite.id} value={sprite.id}>
                {sprite.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {!selectedEntityType && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Select an entity type to place on the map
        </Typography>
      )}
    </Paper>
  );
}
