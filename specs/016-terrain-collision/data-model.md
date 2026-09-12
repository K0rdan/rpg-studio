# Data Model: Terrain Collision

## TileProperties

Existing shared type. Fields used by this feature:

- `id: number` — tileset tile index, matching values stored in layer `data` (not `-1`).
- `is_collidable?: boolean` — missing or `false` is walkable; `true` is blocking.

Validation:

- `id` MUST be an integer `>= 0`.
- `is_collidable: true` is the only value that must be persisted.
- Duplicate `id` entries are invalid; last write wins if encountered during load.

## Tileset

Existing field:

- `tiles?: TileProperties[]`

Compatibility:

- Omitted `tiles` means every tile is walkable.
- Empty array means every tile is walkable.
- Sparse arrays are allowed (only blocking tiles present).

## Tileset collision overlay (static tilesets)

Not part of `packages/types` game data. Persistence record:

- `projectId: string`
- `tilesetId: string` (registry id, e.g. `ts1`)
- `tiles: TileProperties[]`
- `updatedAt: Date`

Merged onto the in-memory `Tileset.tiles` of that registry tileset for the project. Maps that share the tileset id share the marks.

## Blocking cell (derived, not persisted)

Inputs: map layers, tileset `tiles`, map width/height.

A cell `(x, y)` is blocking when:

1. `x < 0`, `y < 0`, `x >= width`, or `y >= height`, or
2. any participating layer has a collidable tile at index `y * width + x`.

A layer participates when `visible !== false` and `(priority ?? 'below') === 'below'`.

Tile index `-1` is never collidable.

## Player occupancy (derived, not persisted)

- Current position `(px, py)` in tile space occupies the half-open 1×1 AABB `[px, px + 1) × [py, py + 1)`.
- Proposed movement is applied on X, then Y.
- A proposed AABB is rejected on that axis when it overlaps a blocking cell that the current AABB does not already overlap.

## Editor session state (not persisted)

- Selected tileset tile blocking toggle (writes through to `Tileset.tiles`).
- Tileset dirty flag, independent of map dirty.
- Collision overlay visibility boolean.
