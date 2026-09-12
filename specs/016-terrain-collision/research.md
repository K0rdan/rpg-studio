# Research: Terrain Collision

## Collision authorship

**Decision**: Author blocking on tileset tiles via existing `TileProperties.is_collidable`. Store only tiles that are blocking (`id` + `is_collidable: true`). Missing entries and omitted `tiles` are walkable.

**Rationale**: The type already exists. One mark applies to every map that uses the tileset, which matches the spec. A dedicated collision layer would force creators to paint twice.

**Alternatives considered**: Per-cell map collision data; a hidden collision layer; inferring solids from render priority.

## Participating layers

**Decision**: A layer participates only when it is visible and its resolved priority is `below`. Hidden, `same`, and `above` layers never block. Empty cells (`-1`) never block.

**Rationale**: This is the spec default and keeps canopies and same-depth props walkable. A fence that must also stop the player uses a blocking below tile at the same cell.

**Alternatives considered**: All visible layers; a per-layer collision toggle (deferred).

## Movement resolution

**Decision**: Treat the player as a 1×1 tile AABB whose origin is the current tile-space position. Resolve X then Y independently so diagonal movement slides along walls. Map bounds are blocking. Cells that already overlap the current AABB do not stop the player (so painting under their feet does not freeze them).

**Rationale**: `PlayerController` already uses continuous tile coordinates. Axis separation is the standard way to satisfy FR-008 without grid-locked steps.

**Alternatives considered**: Discrete tile steps; pixel hitboxes; blocking the whole diagonal when either axis is solid.

## Persistence of static tilesets

**Decision**: Persist `tiles` on Mongo tileset documents. For registry tilesets (non-ObjectId ids such as `ts1`), upsert a project-scoped overlay document `{ projectId, tilesetId, tiles }` and merge it on GET, list, and preview.

**Rationale**: Project tilesets have a natural document. Static tilesets are shared code assets with no Mongo row; a project overlay still shares marks across maps in that project without editing the registry.

**Alternatives considered**: Making static tilesets read-only; cloning the registry tileset into the project on first edit; storing marks on `GameProject`.

## Editor authoring

**Decision**: Add a Blocking control for the selected palette tile and a session-only map overlay that calls the same core walkability helper as the engine. Palette cells that are blocking show a persistent badge. Tileset edits set a tileset dirty flag and persist through PATCH on Save together with the map.

**Rationale**: Select + toggle + preview stays within three interactions. Sharing the core helper makes the overlay match runtime (SC-005). Preview currently loads saved tilesets, so Save must persist marks.

**Alternatives considered**: Immediate autosave on every toggle; a separate collision brush on the map; right-click only with no overlay.

## Runtime wiring

**Decision**: `GameEngine` passes the current map and tileset into `PlayerController.update`. Collision is skipped when player controls are disabled (editor canvas). `apps/player` needs no feature-specific code.

**Rationale**: The player app already hands tilesets into `GameEngine.init`. Putting the query in core keeps preview and standalone play identical.

**Alternatives considered**: Duplicating collision in the editor preview adapter; entity-to-entity checks in this feature.
