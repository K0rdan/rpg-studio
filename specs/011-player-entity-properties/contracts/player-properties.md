# API Contracts: Player Entity Properties

**Feature**: 011 | **Branch**: `011-player-entity-properties`

> No new API endpoints are required. Player properties are stored as part of the existing `Entity` document on the `maps` collection and managed through existing entity CRUD routes.

---

## Existing Endpoints (unchanged interface, new `playerProperties` field)

### `POST /api/projects/[projectId]/maps/[mapId]/entities`
### `PUT /api/projects/[projectId]/maps/[mapId]/entities/[entityId]`

**New optional field in request body** (only sent for player entities):

```json
{
  "type": "player",
  "name": "Player",
  "x": 5,
  "y": 3,
  "commands": [],
  "enabled": true,
  "playerProperties": {
    "speed": 4,
    "health": 100,
    "maxHealth": 100
  }
}
```

**Response** — same shape, `playerProperties` echoed back:

```json
{
  "id": "abc123",
  "type": "player",
  "name": "Player",
  "x": 5,
  "y": 3,
  "commands": [],
  "enabled": true,
  "playerProperties": {
    "speed": 4,
    "health": 100,
    "maxHealth": 100
  }
}
```

---

## `packages/core` — `PlayerController` constructor change

```typescript
// Before
new PlayerController(playerEntity, tileWidth, tileHeight)
// speed was hardcoded inside PlayerController

// After
new PlayerController(playerEntity, tileWidth, tileHeight)
// speed is read from playerEntity.playerProperties?.speed ?? 4
```

No interface change to `GameEngine.init()`.
