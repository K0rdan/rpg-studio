# Feature: Map Entity Placement

## Goal
Enable game designers to place interactive entities (NPCs, player spawns, and interactions) on map tiles. Entities will display charset animations in the player application, bringing maps to life with characters and interactive elements.

## User Stories

### Core Features
- As a game designer, I want to place a player spawn point on my map so that I can define where the player starts.
- As a game designer, I want to place NPCs on my map so that I can populate the world with characters.
- As a game designer, I want to assign charset sprites to NPCs so that they display with animations.
- As a game designer, I want to place interaction points on my map for future dialog/event systems.
- As a game designer, I want to edit entity properties (name, sprite, position) so that I can configure them correctly.
- As a game designer, I want to delete entities from my map so that I can remove unwanted elements.
- As a game designer, I want entities to align with the tile grid so that placement is precise and consistent.

### Player Features
- As a player, I want to see my character spawn at the designated player spawn point.
- As a player, I want to see NPCs displayed with their charset animations.
- As a player, I want NPCs to remain static with idle animations while I move around.

## Requirements

### Entity Types
- **Player Spawn**: Defines the starting position for the player character
  - Has a sprite reference for visual representation in editor
  - Only one player spawn per map (enforced in UI)
- **NPC**: Non-playable characters with charset sprites
  - Has a sprite reference for charset animation
  - Optional character data reference for stats/attributes
- **Interaction**: Interactive points for future event system
  - Visual indicator in editor
  - Placeholder for future dialog/event data

### Entity Placement (Editor)
- Entity tool in drawing toolbar (keyboard shortcut: 'N')
- Entity palette showing available entity types
- Click to place entity at tile position
- Visual indicators for entities on map canvas
- Select entity to edit properties
- Delete key to remove selected entity
- Entities snap to tile grid (tile-based coordinates)

### Entity Properties Panel
- Edit entity name
- Select sprite for Player Spawn and NPC entities
- View/edit entity position (x, y in tiles)
- Delete entity button
- Entity-specific properties (future: dialog, events, etc.)

### Entity Rendering (Core Engine)
- EntityRenderer class to render entities on map
- Use SpriteRenderer for charset animations
- Render entities after map layers, before UI
- Support entity lookup by ID or position
- Scale entities to match tile size

### Player Integration
- Load entities from map data
- Position player at player_spawn entity location
- Render NPCs with charset animations (idle state)
- Display interaction points (visual indicator)
- Fallback to current behavior if no player spawn exists

## Technical Considerations
- Entity positions stored as tile coordinates (x, y in tiles)
- Backward compatibility: maps without entities default to empty array
- Use enum for EntityType (PlayerSpawn, NPC, Interaction)
- Reuse SpriteRenderer for entity animations
- Entity data stored in Map.entities array
- Validate entity data on save (required fields, valid sprite references)

## Success Criteria
- ✅ Can place player spawn, NPC, and interaction entities on map
- ✅ Can edit entity properties (name, sprite, position)
- ✅ Can delete entities
- ✅ Entities persist when saving/loading map
- ✅ Player spawns at player_spawn entity in player application
- ✅ NPCs display with charset animations in player application
- ✅ Entity placement works with zoom controls
- ✅ Multiple entities can exist on same map
- ✅ E2E tests cover entity placement workflow
