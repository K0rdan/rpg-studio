# Data Model: Player Entity Properties

**Feature**: 011 | **Branch**: `011-player-entity-properties`

---

## New: `PlayerProperties` type (`packages/types/src/entity.ts`)

```typescript
/**
 * Gameplay properties specific to the Player entity.
 * Stored as a sub-object on Entity to keep Entity flat for NPC/trigger types.
 */
export interface PlayerProperties {
  /** Movement speed in tiles per second. Default: 4 */
  speed: number;

  /** Current hit points. Default: 100 */
  health: number;

  /** Maximum hit points (used to render health bar). Default: 100 */
  maxHealth: number;
}

/** Default player properties applied when a player entity is created */
export const DEFAULT_PLAYER_PROPERTIES: PlayerProperties = {
  speed: 4,
  health: 100,
  maxHealth: 100,
};
```

---

## Changed: `Entity` type (`packages/types/src/entity.ts`)

```diff
 export interface Entity {
   id: string;
   name: string;
   type?: 'player' | 'npc' | 'object' | 'door' | 'chest' | 'trigger';
   template?: string;
   x: number;
   y: number;
   spriteId?: string;
   direction?: 'up' | 'down' | 'left' | 'right';
-  trigger: TriggerType;     // ← was required
+  trigger?: TriggerType;    // ← now optional (player entities omit it)
   commands: Command[];
   enabled: boolean;
   notes?: string;
+  /** Player-specific gameplay properties. Only present when type === 'player'. */
+  playerProperties?: PlayerProperties;
 }
```

---

## Persistence

Player entity data is stored in **MongoDB** in the `maps` collection, embedded in `map.entities[]`. The new `playerProperties` sub-object is stored alongside existing entity fields. No migration needed — existing documents without `playerProperties` will use the defaults at runtime.

---

## Entity Template Update

`ENTITY_TEMPLATES` for the `player` template in `apps/editor/src/constants/entityTemplates.ts` will be updated to include `playerProperties` defaults:

```typescript
{
  id: 'player',
  label: 'Player Spawn',
  icon: '🎮',
  defaultEntity: {
    name: 'Player',
    type: 'player',
    x: 0, y: 0,
    commands: [],
    enabled: true,
    playerProperties: DEFAULT_PLAYER_PROPERTIES,
    // trigger: intentionally omitted
  }
}
```
