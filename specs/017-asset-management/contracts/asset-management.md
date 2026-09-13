# Contract: Asset Management

Shared shapes live in `packages/types` (`AssetKind`, `AssetUsage`, `AssetUsageResponse`).
All routes require the same project access as other project APIs.

## GET usage

`GET /api/projects/{projectId}/assets/{kind}/{assetId}/usage`

Path:

- `kind`: `tileset` | `charset`
- `assetId`: tileset id (ObjectId hex or registry id such as `ts1`) or sprite ObjectId hex

Response `200`:

```json
{
  "kind": "tileset",
  "id": "ts1",
  "origin": "registry",
  "usages": [
    { "type": "map", "id": "…", "name": "Overworld" }
  ]
}
```

Charset example:

```json
{
  "kind": "charset",
  "id": "…",
  "usages": [
    { "type": "entity", "id": "e1", "name": "Hero", "mapId": "m1" },
    { "type": "character", "id": "c1", "name": "Hero template" }
  ]
}
```

Rules:

- Scan only maps and characters listed on the project.
- Tileset usages: `map.tilesetId === assetId`.
- Charset usages: `entity.spriteId === assetId` on those maps; `character.spriteId === assetId`.
- `origin` is present for tilesets (`registry` vs `project`) and omitted for charsets.
- Empty `usages` is a valid unused asset (`200`, not `404`).
- `400` when `kind` is not `tileset` or `charset`.
- `404` when the asset does not exist in this project (unknown sprite; unknown tileset that is neither registry nor project document).

## DELETE tileset (existing, tightened)

`DELETE /api/projects/{projectId}/tilesets/{tilesetId}`

Changes from current behavior:

- Registry / built-in ids MUST return `403` with a message that built-in tilesets cannot be deleted (today they 404 because there is no Mongo row).
- Usage scan MUST be scoped to the project's maps (not a global `{ tilesetId }` query).
- When usages exist: `409` with body `{ message, ...AssetUsageResponse }` (status `409` instead of the current `400`).
- When unused project tileset: existing blob + document + `$pull` `project.tilesets` (`200`).

## DELETE charset / sprite (existing, tightened)

`DELETE /api/projects/{projectId}/sprites/{spriteId}`

Changes from current behavior:

- Compute charset usages first (same helper as GET usage).
- When usages exist: `409` with `{ message, ...AssetUsageResponse }`. No blob or document delete.
- When unused: existing blob delete (non-fatal if storage offline), Mongo delete, `$pull` `project.sprites`. Keep `204` on success.

## Inspector / UI (non-HTTP)

- Tileset selection → Context Panel: existing `TilePalette`; Inspector: `TilesetInspector`.
- Charset selection → Context Panel: `CharsetPreview`; Inspector: `CharsetInspector`.
- Follow usage: `type === 'map'` selects that map; `type === 'entity'` selects that map then entity; `type === 'character'` has no canvas target in the current editor — show the usage as information only (or select if a character inspector already exists). Do not invent a character editor in this feature.
- Sounds: no new endpoints.

## Compatibility

- List/get tilesets and sprites payloads stay unchanged.
- Preview/export payloads stay unchanged.
- No Mongo schema migration.
