# Contract: Terrain Collision

## Persisted tileset tile shape

```ts
interface TileProperties {
  id: number;
  is_collidable?: boolean;
}

interface Tileset {
  id: string;
  name: string;
  image_source: string;
  tile_width: number;
  tile_height: number;
  source_tile_width?: number;
  source_tile_height?: number;
  tiles?: TileProperties[];
}
```

## Compatibility

- Omitted `tiles` or omitted `is_collidable` is walkable.
- Existing create/list/get/preview/export payloads MUST include `tiles` when present.
- No map document migration.

## Tileset responses

`GET /api/projects/{projectId}/tilesets`

`GET /api/projects/{projectId}/tilesets/{tilesetId}`

`GET /api/tilesets?projectId={projectId}`

`GET /api/projects/{projectId}/preview`

Each tileset object MUST include `tiles` (array, possibly empty) after merging Mongo fields and any static-tileset overlay for that project.

## Update blocking marks

`PATCH /api/projects/{projectId}/tilesets/{tilesetId}`

Request:

```json
{
  "tiles": [{ "id": 7, "is_collidable": true }]
}
```

Rules:

- Replaces the stored `tiles` array for that tileset in the project.
- Mongo-backed tilesets write `tiles` on the tileset document.
- Registry tilesets (non-ObjectId id) upsert the project overlay.
- `tiles` MUST be an array. Each item MUST have integer `id >= 0`. `is_collidable` other than `true` MAY be omitted from storage.
- Auth and project access match other tileset routes.
- `404` when the tileset id is neither a project tileset nor a known registry tileset.
- `400` on invalid payload.

Response: the formatted tileset including merged `tiles`.

## Runtime contract

Given a map and tileset:

- Participating layers: visible and resolved priority `below`.
- Cell blocked: out of bounds or any participating layer tile with `is_collidable === true`.
- Player AABB: 1×1 tile square at the current position, X then Y, sliding on the free axis.
- Occupied blocked cells under the current AABB do not prevent leaving that cell.
