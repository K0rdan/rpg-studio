# Data Model: Layer Focus Aids

## Unchanged persisted model

`Map` and `Layer` stay as in 013:

- `Layer.name`, `Layer.data`, optional `Layer.visible`
- Empty tile remains `-1`
- No opacity, tint, isolate, or marker fields on disk

## Editor session state

| Field | Meaning |
|---|---|
| `activeLayer` | Index of the layer targeted by painting (already exists). |
| `isolateLayers` | When true, only the active tile layer is drawn, ignoring other layers' visibility for presentation. |
| Focus policy | Derived: if isolate is off and at least two layers have effective visibility, inactive visible layers are subdued. |

Effective visibility for focus (not isolate): `layer.visible !== false`.

## Derived presentation

For each layer index `i` while editing:

1. If `isolateLayers`: draw `i === activeLayer` at full strength; skip all other tile layers.
2. Else if `visible === false`: skip.
3. Else if `i === activeLayer`: full strength.
4. Else if count of visible layers ≥ 2: subdued.
5. Else: full strength.

Entities are not part of this table; they always draw after tiles at full strength.

## Empty-cell occupancy

For overlay cell `x, y` on the active layer:

- Marker on ⇔ active layer is visible (or isolated) AND `data[y * width + x] === -1`
- Marker off ⇔ tile present, layer hidden without isolate, or no current map

## Transitions

- **Select layer**: update `activeLayer`; isolate, if on, follows the new index.
- **Toggle isolate**: flip `isolateLayers`; do not mutate `visible`.
- **Toggle visible**: mutates persisted `visible` and marks the map dirty; isolate unchanged.
- **Switch map**: `isolateLayers = false`; clamp `activeLayer`.
- **Save / preview / player**: ignore session presentation entirely.
