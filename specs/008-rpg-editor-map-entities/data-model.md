# Data Model: Map Entity Placement

This document outlines the data structures for map entities, based on the feature specification. These types will be implemented in `packages/types/src/entity.ts`.

## EntityType (Enum)

Defines the available entity types.

```typescript
export enum EntityType {
  PlayerSpawn = 'player_spawn',
  NPC = 'npc',
  Interaction = 'interaction'
}
```

## BaseEntity

Common properties shared by all entity types.

- **id**: `string` - Unique identifier for the entity
- **type**: `EntityType` - The type of entity
- **x**: `number` - Tile X coordinate (not pixels)
- **y**: `number` - Tile Y coordinate (not pixels)
- **name**: `string` - Display name for the entity

## PlayerSpawnEntity

Defines where the player starts on the map.

- **type**: `EntityType.PlayerSpawn` - Discriminated union type
- **spriteId**: `string` - Reference to sprite for visual representation in editor

Extends: `BaseEntity`

## NPCEntity

Non-playable character with charset animation.

- **type**: `EntityType.NPC` - Discriminated union type
- **spriteId**: `string` - Reference to charset sprite for animation
- **characterId**: `string | undefined` - Optional reference to character data (stats, attributes)

Extends: `BaseEntity`

## InteractionEntity

Interactive point for future event/dialog system.

- **type**: `EntityType.Interaction` - Discriminated union type

Extends: `BaseEntity`

Note: Future properties will include event data, dialog references, etc.

## Entity (Union Type)

Discriminated union of all entity types.

```typescript
export type Entity = PlayerSpawnEntity | NPCEntity | InteractionEntity;
```

## Map (Updated)

The Map interface is extended to include entities.

- **entities**: `Entity[] | undefined` - Array of entities on the map (optional for backward compatibility)

Existing fields: `id`, `name`, `width`, `height`, `tilesetId`, `layers`

## Validation Rules

- Entity `x` must be >= 0 and < map width
- Entity `y` must be >= 0 and < map height
- Entity `id` must be unique within the map
- PlayerSpawn and NPC entities must have valid `spriteId`
- Only one PlayerSpawn entity per map (enforced in UI, not schema)
