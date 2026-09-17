# Contract: Multi Tileset Maps

## Map document

```
tilesetId: string
tilesetIds?: string[]
layers[].data: number[]  // -1 empty; else packed tile ref
```

## Packed tile ref

- `EMPTY_TILE = -1`
- `encode(tilesetIndex, localId) = (tilesetIndex << 16) | (localId & 0xffff)`
- `decode(value)` → `{ tilesetIndex, localId }` or null when empty

## Map create POST `/api/projects/:projectId/maps`

Body may include `tilesetId`. Response includes `tilesetId` and `tilesetIds` (empty or a single-element list).

## Map update PUT `/api/projects/:projectId/maps/:mapId`

Persists `tilesetId`, `tilesetIds`, and `layers` as sent by the editor.
