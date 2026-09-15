# Data Model: Partial Tile Collision

## CollisionRect

Normalized to the tile, origin top-left:

- `x: number` — `>= 0`, `< 1`
- `y: number` — `>= 0`, `< 1`
- `width: number` — `> 0`, `x + width <= 1`
- `height: number` — `> 0`, `y + height <= 1`

Missing on a collidable tile means `{ x: 0, y: 0, width: 1, height: 1 }`.

## TileProperties

- `id: number`
- `is_collidable?: boolean` — only `true` is stored
- `collisionRect?: CollisionRect` — stored only when blocking and not a full cell

## ActorHitbox (runtime default, not persisted)

Default player feet box:

- `offsetX: 0.25`
- `offsetY: 0.5`
- `width: 0.5`
- `height: 0.5`

Full-cell occupancy used when an explicit 1×1 box is requested: `{ offsetX: 0, offsetY: 0, width: 1, height: 1 }`.

## Solid (derived)

Map-space AABB from:

1. Out-of-bounds cells the feet box overlaps (full 1×1 cell), or
2. Each participating below-layer collidable tile at a cell, using full cell or `collisionRect` offset by cell coordinates.

## Collision overlay (derived)

List of in-bounds solids for the current map + tileset. Overlay draws those rectangles, not necessarily full cells.

## Compatibility

- Existing `{ id, is_collidable: true }` tiles remain full-cell solids.
- Omitted `tiles` remains fully walkable.
