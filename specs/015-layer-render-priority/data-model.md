# Data Model: Layer Render Priority

## LayerRenderPriority

Closed set of visual composition roles:

- `below`: rendered before actors.
- `same`: interleaved with actors by bottom Y coordinate.
- `above`: rendered after actors.

## Layer

Existing fields remain unchanged. Add:

- `priority?: LayerRenderPriority`

Validation and compatibility:

- Missing priority resolves to `below`.
- Priority does not affect tile data or visibility.
- Reordering retains the priority with the layer object.

## Depth item

Transient render item:

- `depth`: bottom Y coordinate in pixels.
- `kind`: tile row or actor.
- `order`: stable tie-break within a kind.
- `render`: draws the item into the current Canvas frame.

Depth items are not persisted.
