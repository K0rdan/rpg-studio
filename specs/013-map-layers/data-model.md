# Data Model: Map Layers

## Layer

- `name: string` — trimmed, non-empty display name.
- `data: number[]` — row-major tile indices with exactly `map.width × map.height` entries; `-1` means empty.
- `visible?: boolean` — persistent rendering state. Missing is equivalent to `true` for backward compatibility.

## Map

- Owns an ordered, non-empty `layers` collection.
- `layers[0]` is the lowest tile layer; the final element is the highest.
- Every layer uses the map-level `tilesetId`.
- All tile layers render below map entities.

## Active Layer

- Editor-session state represented by an array index.
- Must be clamped to `0...layers.length - 1` whenever the current map changes.
- Moves with its layer during reordering.
- Selects the nearest valid layer after deletion.

## State transitions

- **Add**: append an empty visible layer and select it.
- **Rename**: trim and replace a layer name; reject an empty result.
- **Move up**: swap with the next array element and increment the active index when it denotes the moved layer.
- **Move down**: swap with the previous array element and decrement the active index when it denotes the moved layer.
- **Remove**: allowed only when more than one layer exists; remove its data and clamp selection.
- **Toggle visibility**: invert effective visibility without changing data.
- **Resize map**: resize all grids and preserve coordinates inside both old and new dimensions.
