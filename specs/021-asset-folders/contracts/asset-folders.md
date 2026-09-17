# Contract: Asset Folders

All routes require project access, like the other project-scoped routes.

`kind` is `tileset` or `charset`. `path` is a normalized folder path; `folderPath` is `''` for root.

## `GET /api/projects/:projectId/asset-folders`

```
200 { "tileset": string[], "charset": string[] }
```

Normalized, deduplicated, sorted. Root is not listed.

## `POST /api/projects/:projectId/asset-folders`

Body `{ kind, path }`. Creates the folder and every missing ancestor.

| Status | When |
| --- | --- |
| `201` | Created; returns `{ kind, path }` |
| `400` | Unknown `kind`, or empty / invalid `path` |

## `DELETE /api/projects/:projectId/asset-folders`

Body `{ kind, path }`.

| Status | When |
| --- | --- |
| `204` | Folder removed |
| `400` | Unknown `kind`, or empty / invalid `path` |
| `409` | Folder contains subfolders, or contains assets at any depth |

## Asset creation

`POST /api/projects/:projectId/tilesets` and `.../sprites` accept an optional `folderPath` form field.
`POST .../tilesets/save-generated` and `.../sprites/save-generated` accept an optional `folderPath` body field.

Omitted or empty means root. An invalid path answers `400`. Blob keys are unaffected.

## `PATCH /api/projects/:projectId/tilesets/:tilesetId`

Body `{ tiles?, name?, folderPath? }` — at least one field.

| Status | When |
| --- | --- |
| `200` | Updated tileset |
| `400` | No supported field, empty `name`, invalid `folderPath`, or invalid `tiles` |
| `403` | Registry tileset with `name` or `folderPath`; only `tiles` is accepted for those |
| `404` | Unknown project tileset |

## `PATCH /api/projects/:projectId/sprites/:spriteId`

Body `{ name?, folderPath? }` — at least one field.

| Status | When |
| --- | --- |
| `200` | Updated sprite |
| `400` | No supported field, empty `name`, or invalid `folderPath` |
| `404` | Unknown sprite in this project |

## Asset listing

`GET .../tilesets` and `GET .../sprites` include `folderPath` when the asset has one. Clients that ignore the field keep working.

## Unchanged

`DELETE` of an asset, the usage endpoint, and the asset image proxy behave exactly as in feature 017.
