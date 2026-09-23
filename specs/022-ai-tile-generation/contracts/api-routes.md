# Contract: Generation API routes

All routes: `requireProjectAccess`. Errors: 401 unauthenticated, 404 unknown project, 403 no access — same as existing project APIs.

Charset `.../sprites/generate` and `save-generated` are **unchanged** in this feature.

## PATCH `/api/projects/{projectId}`

New method on the existing project resource.

Request (JSON, all keys optional but at least one required):

```json
{
  "styleSpec": {
    "tileSize": 32,
    "perspective": "top-down",
    "mood": "warm autumn"
  },
  "generationModel": "gemini",
  "confirmStyleChange": false
}
```

- `tileSize` ∈ {16, 32, 64, 128}; `perspective` ∈ {`top-down`, `3/4`}.
- If accepted generated families exist and `tileSize` or `perspective` change without `confirmStyleChange: true` → **409**.
- `generationModel` ∈ {`gemini`, `gpt`, `claude`} or omitted to clear (server default).

Response **200**: project JSON including `styleSpec` and `generationModel` (same `_id` → `id` mapping as GET).

## GET `/api/projects/{projectId}`

Unchanged plus optional `styleSpec` and `generationModel` when stored.

## POST `/api/projects/{projectId}/tilesets/generate`

Replaces the pre-022 body (`name`, `TilesetStyle`, `custom_prompt`). **Do not** accept `custom_prompt`.

Request:

```json
{
  "stage": "base" | "family" | "transition",
  "category": "vegetation",
  "label": "grass",
  "generationMode": "texture",
  "model": "gpt",
  "pairFamilyIds": ["idA", "idB"],
  "regenerateTilesetId": "existingId"
}
```

| Field | Rules |
|-------|--------|
| `stage` | Required. `base` only when the project has no `role: family` tileset (else 409). `family` requires ≥1 family. `transition` requires ≥2 families and `pairFamilyIds` length 2. |
| `category` / `label` | Required for `base` and `family`. Ignored for `transition` (derived from the pair). |
| `generationMode` | Required for `creator-choice` categories (`vegetation`, `elevation`, `structure`). Forbidden to contradict implied categories (`ground`/`water` → `texture`, `decoration` → `prop`); conflict → 400. Ignored for `transition` (always `texture`). |
| `model` | Optional override; else project `generationModel` (not `modelPreference`). |
| `pairFamilyIds` | Required for `transition`. |
| `regenerateTilesetId` | Optional; when set, this is a regenerate of that document (same uniqueness key). |

Server loads `styleSpec` from the project (400/409 if missing). Server loads reference images from blob storage for stages `family` and `transition` (and for `base` only if `regenerateTilesetId` points at a family that had sources — first-family regen still has none).

Pipeline: PromptBuilder → GenerationClient → PostProcessor (crop +
mode branch: self-tiling **or** background removal) → JSON preview.
**No Mongo insert. No blob upload.**

Response **200**:

```json
{
  "preview_data": "data:image/png;base64,…",
  "generation_params": {
    "stage": "base",
    "category": "vegetation",
    "label": "grass",
    "generationMode": "texture",
    "tilingMode": "individual",
    "selfTilingScore": 0.94,
    "tile_width": 32,
    "tile_height": 32,
    "model": "gemini",
    "sourceFamilyIds": [],
    "pairFamilyIds": null,
    "regenerateTilesetId": null,
    "prompt": "…"
  }
}
```

`preview_data` MUST already be post-processed (exact `tileSize*8` square).
`tilingMode` MUST be present so the UI can tell the creator whether
cells are individually reusable or a fixed 8×8 stamp (FR-019).
`selfTilingScore` is optional (texture only) and MUST NOT be shown raw.

Unavailable model: **409** `{ "message": "…", "code": "model_unavailable", "reason": "not_supported" | "misconfigured" | "quota" }` or **429** `{ "code": "model_unavailable", "reason": "rate_limit" }`. No `preview_data`.

## POST `/api/projects/{projectId}/tilesets/save-generated`

Accept path. Client sends the preview it just received (same as today) plus lineage fields from `generation_params`.

Request:

```json
{
  "name": "grass",
  "tile_width": 32,
  "tile_height": 32,
  "image_data": "data:image/png;base64,…",
  "folderPath": "",
  "category": "vegetation",
  "label": "grass",
  "role": "family",
  "generationMode": "texture",
  "tilingMode": "individual",
  "selfTilingScore": 0.94,
  "sourceFamilyIds": [],
  "pairFamilyIds": null,
  "regenerateTilesetId": null,
  "model": "gemini",
  "prompt": "…"
}
```

Server MUST run PostProcessor again on `image_data` (do not trust the
client). Dimensions must match project `styleSpec.tileSize`. Duplicate
`category`+`label` without `regenerateTilesetId` → **409**. Server
recomputes `generationMode` / `tilingMode` / `selfTilingScore`; it
MUST NOT persist client-supplied tiling fields blindly.

On insert: `generation_metadata` as in data-model.md, `status: 'fresh'`.
`tile_width` / `tile_height` remain `styleSpec.tileSize` even for
`fixed-block`. Push id onto `project.tilesets`.

On regenerate: update the existing tileset’s blob and metadata; set it `fresh`; set **direct** dependents `status: 'stale'`. Same tileset `id`.

Response **201** (insert) or **200** (regenerate): tileset JSON including `generation_metadata`.

Reject is client-side: do not call this route.

## GET `/api/projects/{projectId}/tilesets/{tilesetId}`

Extend the existing GET (or the object already returned by list) with:

```json
{
  "dependents": [
    { "id": "…", "name": "grass ↔ dirt", "role": "transition", "status": "fresh" }
  ]
}
```

`dependents` is `[]` when the tileset is not generated or has no lineage children. Used for the regenerate confirmation (FR-011). Query as in data-model.md.

## GET `/api/projects/{projectId}/tilesets`

List includes `generation_metadata` (legacy + new fields) so the UI can flag stale and suggest adjacent-category transitions (adjacency helper is server or client using the config in research.md). No schema change required beyond metadata passthrough.

## Auth and validation summary

| Status | When |
|--------|------|
| 400 | Missing style, invalid category/label/stage, bad image, missing or conflicting `generationMode` |
| 409 | Stage not allowed yet; duplicate family; style change without confirm; model not_supported / quota / misconfigured |
| 429 | Provider rate limit |
| 502 | Provider upstream failure after mapping |
| 500 | Unexpected |
