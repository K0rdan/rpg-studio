# Research: Map Layers

## Existing model

**Decision**: Preserve `Map.layers: Layer[]`, row-major `number[]` tile data, and `-1` as the empty tile.

**Rationale**: The shared model, map API, legacy editor, player, and renderer already support multiple ordered layers.

**Alternatives considered**: A two-dimensional grid, per-layer tilesets, and fixed semantic layer types would break existing documents or expand the feature beyond the requested editor capability.

## Layer visibility

**Decision**: Add optional `visible`; only the explicit value `false` hides a layer.

**Rationale**: Existing documents have no visibility field and must render unchanged without a database migration.

**Alternatives considered**: A required field needs migration; editor-only visibility would not persist into preview or player rendering.

## Active-layer identity

**Decision**: Keep the active layer as an editor-only array index and transform that index with each reorder or deletion.

**Rationale**: Layers currently have no IDs. Index transformation is deterministic and avoids persisting generated identifiers solely for local selection.

**Alternatives considered**: Adding layer IDs would complicate old-document normalization without adding user value in this scope.

## Layer ordering UX

**Decision**: Display highest layers first and provide explicit move-up and move-down controls.

**Rationale**: This reflects visual stacking, is keyboard accessible, and needs no drag-and-drop dependency.

**Alternatives considered**: Drag and drop adds interaction and test complexity; displaying array order directly puts the background at the top contrary to common editor conventions.

## Rendering relationship

**Decision**: Render all visible tile layers in array order in the existing map pass, then entities.

**Rationale**: This preserves current engine behavior and the user-selected scope.

**Alternatives considered**: Foreground and collision layers require new scene passes and gameplay semantics and are explicitly excluded.

## Resizing

**Decision**: Resize every layer by copying the overlapping top-left rectangle and filling new cells with `-1`.

**Rationale**: It matches legacy editor behavior and preserves the map-grid invariant.

**Alternatives considered**: Clearing layers loses work; leaving old data lengths creates rendering and editing inconsistencies.
