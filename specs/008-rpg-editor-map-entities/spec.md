# Feature 008: Map Entity Placement & Editing

**Status**: In Progress (Editor Complete, Player Integration Pending)  
**Priority**: High  
**Dependencies**: 001 (Project Management), 003 (Map Creation)

---

## Overview

Enable game designers to place and edit interactive entities (NPCs, items, triggers, spawn points) on maps through an intuitive editor interface. Validate the complete editor-to-player workflow by testing entities in the player application.

---

## Goals

1. **Entity Placement**: Click-to-place entities on map canvas
2. **Entity Editing**: Edit entity properties through properties panel
3. **Entity Management**: View, select, and delete entities
4. **Player Integration**: Render and interact with entities in player
5. **Workflow Validation**: Complete editor → player workflow

---

# Feature: Map Entity System

## Goal
Enable game designers to place interactive entities on maps with triggers, conditions, and commands. Entities can be NPCs, signs, treasure chests, teleports, or any interactive element.

## User Stories

### Core Features
- As a game designer, I want to place entities on my map so I can add interactive elements
- As a game designer, I want to configure entity triggers (action button, player touch) so I can control how they activate
- As a game designer, I want to add commands to entities (show message, teleport, give item) so I can define their behavior
- As a game designer, I want to use a visual command editor so I can configure entities without writing code
- As a game designer, I want to use entity templates (NPC, Sign, Treasure, Door) so I can quickly add common entity types
- As a game designer, I want entities to display with sprites so I can see them on the map

### Player Features
- As a player, I want to interact with entities using the action button
- As a player, I want to see messages when I talk to NPCs
- As a player, I want to be teleported when I step on doors/portals
- As a player, I want to receive items from treasure chests

## Requirements

### Entity Structure
Each entity has:
- **Name**: Descriptive name for the designer
- **Location**: X, Y tile coordinates
- **Sprite**: Visual representation (optional)
- **Trigger**: How it activates (action button, player touch, autorun, map load)
- **Commands**: List of actions to execute when triggered
- **Enabled**: Can be disabled without deleting

### Trigger Types (MVP)
- **Action Button**: Player faces entity and presses Space/Enter
- **Player Touch**: Activates when player steps on the tile

### Commands (MVP)
1. **Show Message**: Display text to player
   - Text content
   - Optional character face
   - Position (top/middle/bottom)

2. **Teleport Player**: Move player to location
   - Target map (optional, same map if omitted)
   - X, Y coordinates
   - Direction

3. **Give Item**: Add item to player inventory
   - Item ID
   - Quantity

### Entity Templates
Pre-configured entities for quick placement:
- **NPC**: Action button trigger + Show Message
- **Sign**: Action button trigger + Show Message
- **Treasure**: Action button trigger + Show Message + Give Item
- **Door**: Player touch trigger + Teleport Player
- **Spawn Point**: Map load trigger + Teleport Player (same map)
- **Custom**: Empty entity to configure manually

### Visual Command Editor
- Command list with add/edit/delete
- Dialog-based command editing
- Form inputs (dropdowns, text fields)
- Validation to prevent errors
- Drag to reorder commands

## Technical Considerations
- Entity positions stored as tile coordinates
- Commands execute in sequence
- Visual editor prevents invalid configurations
- Backward compatibility: maps without entities work fine
- Database stores entities with mapId reference

## Success Criteria
- ✅ Can place entity templates on map
- ✅ Can configure entity triggers
- ✅ Can add/edit/remove commands visually
- ✅ Entities persist when saving map
- ✅ Entities trigger correctly in player
- ✅ Commands execute as configured
- ✅ Messages display in player
- ✅ Teleports work in player
- ✅ Items added to inventory in player

### 4. Trigger (`trigger`)
**Purpose**: Interactive zones that trigger events

**Properties**:
- `id`: string
- `type`: 'trigger'
- `name`: string (e.g., "Door to Castle")
- `x`: number (tile coordinate)
- `y`: number (tile coordinate)
- `width`: number (optional, default: 1 tile)
- `height`: number (optional, default: 1 tile)
- `action`: string (e.g., "teleport", "dialogue", "cutscene")
- `parameters`: Record<string, unknown> (action-specific data)

**Actions** (Future):
- **Teleport**: Move player to another map/position
- **Dialogue**: Show dialogue box
- **Cutscene**: Play cutscene
- **Custom**: Execute custom script

---

## Technical Architecture

### Type Definitions

**Location**: `packages/types/src/entity.ts`

> ✅ **Implemented** — the type system uses a flat `Entity` interface with a `Commands` pattern rather than the union type originally proposed. This approach was chosen to be more flexible for the visual command editor.

```typescript
// Trigger types — how entities activate
export enum TriggerType {
  ActionButton = 'action_button',
  PlayerTouch = 'player_touch',
  Autorun = 'autorun',
  MapLoad = 'map_load',
}

// Command types — what entities do when triggered
export enum CommandType {
  ShowMessage = 'show_message',
  TeleportPlayer = 'teleport_player',
  GiveItem = 'give_item',
}

export interface ShowMessageCommand {
  type: CommandType.ShowMessage;
  parameters: { text: string; face?: string; position?: 'top' | 'middle' | 'bottom' };
}

export interface TeleportPlayerCommand {
  type: CommandType.TeleportPlayer;
  parameters: { mapId?: string; x: number; y: number; direction?: 'up' | 'down' | 'left' | 'right' };
}

export interface GiveItemCommand {
  type: CommandType.GiveItem;
  parameters: { itemId: string; quantity: number };
}

export type Command = ShowMessageCommand | TeleportPlayerCommand | GiveItemCommand;

// Single flat Entity interface (replaces the original union type)
export interface Entity {
  id: string;
  name: string;
  type?: 'player' | 'npc' | 'object' | 'door' | 'chest' | 'trigger';
  template?: string;  // Template used (e.g. 'npc', 'interactable', 'container')
  x: number;  // Tile coordinate
  y: number;  // Tile coordinate
  spriteId?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  trigger: TriggerType;
  commands: Command[];
  enabled: boolean;
  notes?: string;
}
```

### Database Schema

**Entities Collection**:
```typescript
interface EntityDocument {
  _id: ObjectId;
  projectId: string;  // Project this entity belongs to
  mapId: string;      // Map this entity is placed on
  type: EntityType;
  name: string;
  x: number;
  y: number;
  // Type-specific fields
  spriteId?: string;
  dialogue?: string;
  behavior?: string;
  itemId?: string;
  quantity?: number;
  action?: string;
  parameters?: Record<string, unknown>;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `{ projectId: 1, mapId: 1 }` - Query entities by map
- `{ projectId: 1, type: 1 }` - Query entities by type

### API Endpoints

**Base Path**: `/api/projects/[projectId]/entities`

**Endpoints**:
- ✅ `GET /api/projects/[projectId]/entities` - List all entities (with optional `?mapId=xxx` filter)
- ✅ `POST /api/projects/[projectId]/entities` - Create entity
- ✅ `GET /api/projects/[projectId]/entities/[entityId]` - Get entity
- ✅ `PUT /api/projects/[projectId]/entities/[entityId]` - Update entity
- ✅ `DELETE /api/projects/[projectId]/entities/[entityId]` - Delete entity

**Request/Response Examples**:

```typescript
// POST /api/projects/{projectId}/entities
{
  "type": "npc",
  "name": "Guard Captain",
  "x": 5,
  "y": 10,
  "mapId": "map123",
  "spriteId": "sprite456",
  "dialogue": "Halt! Who goes there?",
  "behavior": "static"
}

// Response
{
  "id": "entity789",
  "type": "npc",
  "name": "Guard Captain",
  "x": 5,
  "y": 10,
  "spriteId": "sprite456",
  "dialogue": "Halt! Who goes there?",
  "behavior": "static"
}
```

---

## UI Components

### 1. Entity Palette

**Location**: Context Panel (when entity tool is active)

**Layout**:
```
┌─────────────────────────────┐
│ ENTITY PALETTE              │
├─────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │ NPC │ │Item │ │Trig │    │
│ │ 👤  │ │ 💎  │ │ ⚡  │    │
│ └─────┘ └─────┘ └─────┘    │
│ ┌─────┐                     │
│ │Spawn│                     │
│ │ 🚩  │                     │
│ └─────┘                     │
└─────────────────────────────┘
```

**Features**:
- Grid of entity type buttons
- Visual icon for each type
- Click to select entity type
- Highlighted when selected

### 2. Entity Properties Panel

**Location**: Context Panel (when entity is selected)

**Layout**:
```
┌─────────────────────────────┐
│ ENTITY PROPERTIES           │
├─────────────────────────────┤
│ Type: NPC                   │
│ Name: [Guard Captain    ]   │
│ Position: (5, 10)           │
│                             │
│ Sprite: [Select Sprite ▼]  │
│ Dialogue: [Enter text...]  │
│ Behavior: [Static      ▼]  │
│                             │
│ [Delete Entity]             │
└─────────────────────────────┘
```

**Features**:
- Entity type display (read-only)
- Name input field
- Position display (x, y)
- Type-specific properties
- Delete button

### 3. Entity Tool

**Location**: Toolbar (vertical left sidebar)

**Icon**: Person icon (👤)  
**Keyboard Shortcut**: `N`  
**Tooltip**: "Entity (N)"

**Behavior**:
- Click to activate entity tool
- Shows entity palette in context panel
- Cursor changes to placement mode
- Click canvas to place selected entity type

### 4. Entity Rendering on Canvas

**Visual Indicators**:
- **NPC**: Sprite or default character icon
- **Item**: Item icon or treasure chest
- **Trigger**: Dashed rectangle outline
- **Spawn Point**: Flag icon

**Selection**:
- Click entity to select
- Selected entity shows highlight/outline
- Properties panel updates

---

## Implementation Phases

### Phase 1: Entity Palette & Selection (Week 1, Days 1-2)

**Components**:
- `EntityPalette.tsx` - Entity type selector
- `entitySelectionStore.ts` - Selection state management

**Tasks**:
- Create entity palette UI
- Implement entity type selection
- Add entity tool to toolbar
- Create selection store

### Phase 2: Entity Placement (Week 1, Days 3-4)

**Components**:
- Update `MapCanvas.tsx` - Add entity placement logic

**Tasks**:
- Handle entity tool click events
- Convert screen coordinates to tile coordinates
- Create entity via API
- Add entity to local state
- Render entity on canvas

### Phase 3: Entity Properties & Editing (Week 2, Days 5-6)

**Components**:
- `EntityProperties.tsx` - Properties editor
- Update `ContextPanel.tsx` - Show entity properties

**Tasks**:
- Create properties panel UI
- Implement property editing
- Update entity via API
- Handle entity deletion

### Phase 4: Entity List & Management (Week 2, Days 7-8)

**Components**:
- `EntityList.tsx` - List of entities on map

**Tasks**:
- Display entity list
- Filter by type
- Click to select entity
- Show entity count

### Phase 5: Player Integration (Week 3, Days 9-10)

**Updates**:
- Player initialization
- Entity rendering in player
- Spawn point handling

**Tasks**:
- Load entities from map
- Position player at spawn point
- Render NPCs with sprites
- Test interactions

### Phase 6: Testing & Polish (Week 3, Days 11-12)

**Testing**:
- Unit tests
- E2E tests
- Manual testing
- Bug fixes

---

## Success Criteria

### Editor
- [x] Can select entity type from palette
- [x] Can place entities on map by clicking
- [x] Entities render at correct tile positions
- [x] Can select entities by clicking
- [x] Can edit entity properties
- [x] Can delete entities
- [x] Entities persist when saving map
- [x] Entity tool works with zoom/pan

### Player
- [ ] Player spawns at spawn point entity
- [ ] NPCs render with sprites
- [ ] Trigger zones are functional
- [ ] Items can be collected
- [x] Backward compatible (maps without entities work)

### Technical
- [ ] API endpoints handle CRUD operations
- [ ] Database stores entities correctly
- [ ] Type safety enforced
- [ ] E2E tests cover entity workflow
- [ ] Performance acceptable with 100+ entities

---

## Future Enhancements

### Phase 2 (Post-MVP)
- **Entity Behaviors**: Wander, patrol patterns
- **Dialogue System**: Full dialogue editor
- **Event System**: Trigger actions and cutscenes
- **Entity Templates**: Reusable entity presets
- **Copy/Paste**: Duplicate entities
- **Multi-select**: Select and move multiple entities
- **Entity Layers**: Z-ordering for entities

### Phase 3 (Advanced)
- **Scripting**: Custom entity behaviors
- **AI Pathfinding**: NPC navigation
- **Quest System**: Quest-related entities
- **Inventory System**: Item management
- **Combat System**: Enemy entities

---

## Dependencies

**Required Features**:
- ✅ 001: Project Management (database, API structure)
- ✅ 003: Map Creation (map editor, canvas)
- ✅ 009: UI Layout (context panel, toolbar)

**Optional Features**:
- Sprite Management (for entity sprites)
- Character System (for NPC data)
- Dialogue System (for NPC interactions)

---

## Technical Considerations

### Performance
- Lazy load entity sprites
- Render only visible entities (viewport culling)
- Batch entity updates
- Optimize entity lookup (spatial hash map)

### Backward Compatibility
- Maps without entities default to empty array
- Player spawns at (0, 0) if no spawn point
- Graceful degradation for missing sprites

### Validation
- Validate entity type on creation
- Ensure required fields present
- Check coordinates within map bounds
- Prevent duplicate default spawn points

### Security
- Verify project ownership before entity operations
- Sanitize entity properties
- Validate sprite/item references exist

---

## References

- [Entity Type Definitions](file:///Users/benjamin/Documents/_dev/_perso/rpg-studio/packages/types/src/entity.ts)
- [Entity API Walkthrough](file:///Users/benjamin/.gemini/antigravity/brain/a38777b7-6494-4ec9-97e2-973a47d71c0e/entities_api_walkthrough.md)
- [Implementation Plan](file:///Users/benjamin/.gemini/antigravity/brain/a38777b7-6494-4ec9-97e2-973a47d71c0e/entity_placement_implementation_plan.md)
