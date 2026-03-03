# API Contracts: Entity Visual Content

**Feature**: 012 | **Branch**: `012-entity-visual-content`

---

## New Endpoints

### `POST /api/projects/[projectId]/sprites`

Upload a spritesheet image and create a Sprite document.

**Content-Type**: `multipart/form-data`

**Form fields**:
| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | File (PNG) | ✅ | ≤ 4MB |
| `name` | string | ✅ | Display name |
| `frame_width` | number | ❌ | Default: 32 |
| `frame_height` | number | ❌ | Default: 64 |
| `animations` | JSON string | ❌ | Default: standard charset layout |

**Response 201**:
```json
{
  "id": "abc123",
  "name": "Hero Charset",
  "image_source": "https://storage.azure.com/...",
  "frame_width": 32,
  "frame_height": 64,
  "animations": {
    "idle": [1],
    "walk_down": [0, 1, 2, 3],
    "walk_left": [4, 5, 6, 7],
    "walk_right": [8, 9, 10, 11],
    "walk_up": [12, 13, 14, 15]
  },
  "projectId": "proj123",
  "createdAt": "2026-03-02T22:00:00Z"
}
```

---

### `GET /api/projects/[projectId]/sprites`

Returns all sprites in the project's library with pre-signed image URLs.

**Response 200**: `Sprite[]`

---

### `DELETE /api/projects/[projectId]/sprites/[spriteId]`

Deletes a sprite document and its storage blob.

**Response 204**: No content.

---

## Changed Endpoints

### `PUT /api/projects/[projectId]/maps/[mapId]/entities/[entityId]`

No interface change. `spriteId` field on the entity body already carries the reference:

```json
{
  "name": "Player",
  "type": "player",
  "spriteId": "sprite-doc-id-here",
  ...
}
```

---

## `GameEngine.init()` loading flow (pseudo-code)

```typescript
// For entities with spriteId:
const spriteDoc = await fetch(`/api/projects/${projectId}/sprites/${entity.spriteId}`);
const imageResult = await assetLoader.loadImage(spriteDoc.image_source);
const spriteRenderer = new SpriteRenderer(spriteDoc, imageResult.asset);

// For player entity:
playerController.setSpriteRenderer(spriteRenderer);

// For NPC entities:
const entityRenderer = new EntityRenderer(entity, spriteRenderer, tw, th);
```
