# Data Model: Multi Tileset Maps

## Map

- `tilesetId: string` — default tileset; alias of `tilesetIds[0]` when that list is non-empty. Kept for existing documents and APIs.
- `tilesetIds?: string[]` — tilesets referenced by this map, **append-only**. Missing list means `[tilesetId]` when `tilesetId` is non-empty, otherwise `[]`.

Do not delete or reorder entries: packed cell values store the index into this list.

## Layer.data

Unchanged type: `number[]`.

| Value | Meaning |
| --- | --- |
| `-1` | Empty |
| `0..65535` | tileset index 0, local tile id (legacy maps) |
| `(tilesetIndex << 16) \| localId` | tile from `tilesetIds[tilesetIndex]` |

`localId` is the tile's index in that tileset's image grid (`TileProperties.id`).

## Compatibility

- Documents that only have `tilesetId` keep working.
- Creating a map with a tileset sets both `tilesetId` and `tilesetIds: [tilesetId]`.
- Replacing the default tileset in map properties writes `tilesetIds[0]` and `tilesetId`; extra entries stay in place.
