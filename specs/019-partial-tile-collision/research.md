# Research: Partial Tile Collision

## Collision shape

**Decision**: Store one optional axis-aligned `collisionRect` on `TileProperties` in normalized tile space `[0, 1]`. `is_collidable: true` without a rect remains a full cell.

**Rationale**: Covers trunks, hedges, and rocks. Four-quadrant masks are too coarse for a centered trunk. Pixel masks couple art to physics and snag on anti-aliasing.

**Alternatives considered**: 4-quadrant passage; runtime alpha tests; multiple rects per tile.

## Movement test

**Decision**: Resolve the player feet AABB against map-space solids. Refuse an axis when the proposed box newly overlaps a solid the current box does not. Keep X-then-Y sliding and sub-stepping.

**Rationale**: Same as 016’s “already overlapping does not freeze,” at rectangle granularity.

**Alternatives considered**: Discrete tile steps; SAT for polygons; pixel masks.

## Player occupancy

**Decision**: Default feet box `offsetX: 0.25, offsetY: 0.5, width: 0.5, height: 0.5` in tile space, origin = sprite cell origin. Not persisted on `PlayerProperties` in this feature.

**Rationale**: Matches RPG Maker-style contact at the feet. A full 1×1 box fights canopies even with tile rects.

**Alternatives considered**: Persist on `PlayerProperties` now; keep 1×1 occupancy.

## Layer participation

**Decision**: Unchanged from 016: only visible below layers contribute solids. Per-layer `contributesToCollision` is deferred.

**Rationale**: Canopies and shadows must stay walkable. Props that block still use a below solid.

**Alternatives considered**: All visible layers; inferred from render priority.

## Fit opaque

**Decision**: Editor-only. Sample the selected tile’s pixels once, take the tight AABB of alpha above 16, write `collisionRect`. Play never reads image data for collision.

**Rationale**: Fast authoring without runtime cost or art/physics coupling.

**Alternatives considered**: Auto-fit on tileset load; persist a bitmap mask.

## Persistence

**Decision**: Keep sparse `tiles` on Mongo tilesets and registry overlays. Persist `collisionRect` only when it is not the full cell.

**Rationale**: Same storage path as 016; no map migration.

**Alternatives considered**: Per-cell map collision data.
