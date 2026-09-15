# Contract: Partial Tile Collision

## Persisted tileset tile shape

```ts
interface CollisionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TileProperties {
  id: number;
  is_collidable?: boolean;
  collisionRect?: CollisionRect;
}
```

## Compatibility

- Omitted `tiles` or omitted `is_collidable` is walkable.
- Omitted `collisionRect` on a collidable tile is a full-cell solid.
- Existing GET/PATCH/preview/export tileset payloads MUST round-trip `collisionRect` when present.
- No map document migration.

## Update tiles

`PATCH /api/projects/{projectId}/tilesets/{tilesetId}`

Request example:

```json
{
  "tiles": [
    { "id": 7, "is_collidable": true },
    { "id": 8, "is_collidable": true, "collisionRect": { "x": 0.35, "y": 0.7, "width": 0.3, "height": 0.3 } }
  ]
}
```

Rules:

- Replaces the stored `tiles` array.
- Persist only collidable entries. Omit `collisionRect` when it equals a full cell.
- `collisionRect` when present MUST be four finite numbers inside the tile with positive width and height.
- `400` on invalid payload. Auth and 404 match existing tileset PATCH.

## Runtime contract

- Participating layers: visible and resolved priority `below`.
- Player feet AABB: origin + default hitbox `(0.25, 0.5, 0.5, 0.5)` unless a caller passes another box.
- A step is refused when the proposed AABB newly overlaps a solid.
- Overlay lists the same in-bounds solids the runtime uses.

## Fit opaque (editor only)

Not an HTTP endpoint. Uses the selected tileset image, alpha threshold 16, writes `collisionRect`. Movement never samples pixels.
