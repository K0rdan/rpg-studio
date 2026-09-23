# RPG Studio — Global Technical Context

**Audience**: `/speckit-plan` (and humans writing `plan.md`).  
**Last verified against the repo**: 2026-09-17  
**Related**: `.specify/memory/constitution.md`, `AGENTS.md`, `specs/DESIGN_MONGODB_OBJECTID_PATTERN.md`

This file is the source of truth for **project-wide** Technical Context. Feature specs still decide *what* to build; this file decides *where* and *with which stack*. Do not rediscover the stack in research.md.

---

## How `/speckit-plan` MUST use this file

1. Read this file together with the feature spec and the constitution.
2. Copy the **Plan fill-in** block below into `plan.md` → Technical Context.
3. Override **only** feature-specific lines:
   - `Primary Dependencies` — list packages/libs the feature actually touches (keep the rest implicit).
   - `Storage` — Mongo collections, blob keys, or `N/A`.
   - `Constraints` — add feature rules; keep the constitution constraints.
   - `Scale/Scope` — name the real files/surfaces this feature changes.
4. Never mark Language, Testing, Target Platform, or Project Type as `NEEDS CLARIFICATION`.
5. Fill Constitution Check using the **gates** section (principles I–XI).
6. Use the **source tree** in this file for Project Structure. Do not paste the plan template’s Option 1/2/3 placeholders.
7. Place new code using the **placement table**. Types first; core stays framework-agnostic; player stays a loader.

---

## Plan fill-in (copy into `plan.md`)

**Language/Version**: TypeScript ~6, strict mode (`any` only with documented justification)  
**Primary Dependencies**: Next.js 16 App Router, React 19, MUI 9, Zustand 5, MongoDB Node driver 7, Better Auth, `@packages/types`, `@packages/core`, `@packages/storage`; Canvas 2D in core; Vite 8 in player; optional `@google/genai` + `sharp` for generation  
**Storage**: MongoDB (Atlas in prod, Docker `mongo:7` locally). Collections: `projects`, `maps`, `tilesets`, `sprites`, `characters`, `entities`, plus Better Auth collections. Blob images via `@packages/storage` (Azure Blob or Azurite). IDs are `string` in app code; convert to `ObjectId` only for `_id` queries.  
**Testing**: Vitest in `packages/core`; Jest (+ `@shelf/jest-mongodb`) in `apps/editor` and `packages/storage`; Cypress in `apps/editor/cypress/` and `apps/player/cypress/`. TDD: tests before implementation.  
**Target Platform**: Modern desktop browsers (editor + player). Editor is a Next.js web app; player is a Vite Canvas app, also embedded in the editor preview via `postMessage`.  
**Project Type**: Turborepo npm workspaces (`apps/*`, `packages/*`)  
**Performance Goals**: Interactive ~60 FPS Canvas loop in editor and player for typical maps; pixel-art rendering (`imageSmoothingEnabled = false`); no extra game engine.  
**Constraints**: Constitution I–XI. Types live in `packages/types`. No React/Next in `packages/core`. No Phaser/Pixi. `apps/player` loads core + game data only. Shared React UI belongs in `packages/ui` (currently unused; do not invent a second shared UI package). Backward-compatible documents: optional fields, never rewrite packed tile data by reordering `tilesetIds`. Generation pipeline must stay in the editor backend (no n8n/Make).  
**Scale/Scope**: Single-user project ownership today. Maps up to 500×500 tiles. Multi-tileset maps via packed layer ints. Pixel tiles typically 16/32/64/128. Charset sheets are 3×4 frames.

---

## Constitution gates (paste adapted into Constitution Check)

| # | Gate | Pass when |
|---|------|-----------|
| I | Types first | New persisted or shared structures land in `packages/types` before editor/core/player use |
| II | Core agnosticism | No React/Next/MUI/Zustand in `packages/core` |
| III | Lightweight player | `apps/player` only loads `@packages/core` and game JSON/`postMessage` payload |
| IV | Native Canvas | Rendering uses `CanvasRenderingContext2D` only |
| V | TDD | Tests exist for new logic (Vitest/Jest) and critical editor flows (Cypress) |
| VI | Native generation orchestration | Generation sequencing lives in the editor backend, not an external workflow tool |
| VII | Image-to-image anchoring | After the first accepted family, later families pass at least one reference image |
| VIII | Generation brick split | `ProjectStyleSpec` / `GenerationClient` / `PromptBuilder` / `PostProcessor` stay separate |
| IX | Post-processing | Crop + grid snap before any generated image is stored or shown as a usable tile |
| X | Reference traceability | Accepted families record references in project state (`AssetGraph` when introduced) |
| XI | Independently testable stages | Base / family / transition stages ship and test without requiring later stages |

Gates VI–XI apply **only** to graphic-asset generation work. Unrelated features: mark them N/A, not FAIL.

MongoDB ID rule (AGENTS.md, not a constitution principle): `string` everywhere except `_id` queries → `ObjectId`. See `specs/DESIGN_MONGODB_OBJECTID_PATTERN.md`.

---

## Repository map

```text
rpg-studio/
├── apps/
│   ├── editor/          # Next.js 16 — creation UI + API routes (the backend)
│   ├── player/          # Vite — Canvas runtime; INIT via postMessage or static JSON
│   └── docs/            # Docusaurus — product docs site
├── packages/
│   ├── types/           # SOURCE OF TRUTH — game/editor contracts
│   ├── core/            # Framework-agnostic engine (Canvas 2D)
│   ├── storage/         # TilesetStorage: Azure Blob + in-memory
│   ├── ui/              # Intended shared React kit (currently empty export)
│   ├── tsconfig/
│   └── eslint-config/
├── specs/               # Spec Kit features (001–022…)
├── .specify/memory/     # constitution.md, this file
├── docker-compose.yml   # local mongo + azurite
└── scripts/             # blob copy, auth checks, etc.
```

npm package names: `@apps/editor`, `player`, `docs`, `@packages/types`, `@packages/core`, `@packages/storage`, `@packages/ui`.

---

## Placement table (where a change belongs)

| Kind of change | Put it here | Do not put it here |
|----------------|-------------|--------------------|
| Data shapes, enums, packed encodings as types | `packages/types/src/*.ts` + re-export `index.ts` | Duplicated interfaces in apps |
| Render, input, collision, tile-ref math, camera transform | `packages/core` | Editor components, player |
| HTTP, auth, Mongo, blob I/O, Gemini, sharp | `apps/editor/src/app/api` and `apps/editor/src/lib` | `packages/core`, `apps/player` |
| Editor UI, Zustand stores, Cypress | `apps/editor` | `packages/core` |
| Shared reusable React (if truly cross-app) | `packages/ui` | New `packages/components` |
| Player bootstrap only | `apps/player/src` | Game rules, persistence |
| Blob provider implementation | `packages/storage` | Ad-hoc Azure SDK in random routes |

Typical feature slice: **types → core (if runtime) → editor lib/API → editor UI → tests**.

---

## Domain model (current types)

All IDs in these interfaces are **hex strings**.

| Type | File | Role |
|------|------|------|
| `GameProject` | `project.ts` | Owner `userId`; arrays of map/character/entity/tileset/sprite ids; optional `assetFolders`, `styleSpec`, `generationModel` |
| `Map` | `map.ts` | `width`/`height` (tiles), `tilesetId`, append-only `tilesetIds?`, `layers[]`, embedded `entities?` |
| `Layer` | `map.ts` | `name`, `data: number[]` (row-major packed tile refs), `visible?` (default true), `priority?` `'below' \| 'same' \| 'above'` (default `'below'`) |
| `Tileset` | `tileset.ts` | Image + `tile_width/height`, optional source tile size, `tiles?` properties, `folderPath?`, `generation_metadata?` |
| `TileProperties` | `tile.ts` | Local tile id, `is_collidable?`, optional normalized `collisionRect` |
| `Sprite` | `sprite.ts` | Charset sheet; default 3×4 walk cycle; `folderPath?`; `projectId?` |
| `Entity` | `entity.ts` | Tile `x,y`; types player/npc/object/door/chest/trigger; `commands[]`; optional `playerProperties` |
| `Character` | `character.ts` | RPG stats + `spriteId` (separate from map entities) |
| `ViewportCamera` | `viewport.ts` | Session-only `{ zoom, offsetX, offsetY }` — not persisted |
| `AssetKind` | `asset-usage.ts` | `'tileset' \| 'charset'` |
| Generation request types | `tileset-generation.ts`, `charset-generation.ts` | Tileset families use `ProjectStyleSpec` + `PromptBuilder` / `GenerationClient` / `PostProcessor`. Charset generate/save remains the existing single-shot flow. |

### Packed tile refs (`packages/core` `tileRef.ts`)

- Empty cell: `EMPTY_TILE = -1`.
- Value = `(tilesetIndex << 16) | localId`.
- Index `0` encodes as the local id alone → legacy maps stay valid.
- `Map.tilesetIds` is **append-only**. Never reorder or delete entries.

### Tileset origins

- **Registry tilesets**: bundled in `apps/editor/src/config/tilesets.ts` (stable string ids, not Mongo `_id`).
- **Project tilesets**: Mongo `tilesets` documents, images in blob storage, referenced from `GameProject.tilesets`.

Entities on a map are **embedded** in the map document. A leftover `entities` collection still exists for some routes; new work should treat the map document as canonical unless a spec explicitly splits them.

---

## Persistence

### MongoDB

- Connect: `apps/editor/src/lib/mongodb.ts` (`ATLAS_URI`, `ATLAS_DATABASE_NAME`).
- Auth DB: Better Auth adapter on the same database (`apps/editor/src/lib/auth.ts`).
- Pattern: store `_id` as ObjectId; store `userId` and all foreign keys as **strings**; map `_id → id` before JSON.

| Collection | Typical document | Notes |
|------------|------------------|--------|
| `projects` | `GameProject` minus `id` | Isolation: `userId === session.user.id`. Missing `userId` is treated as readable (legacy). |
| `maps` | `Map` | Listed from `project.maps` |
| `tilesets` | `Tileset` + `projectId`, `storageLocation` | Registry tilesets are not in this collection |
| `sprites` | `Sprite` | Query by `projectId` and/or project sprite id list |
| `characters` | `Character` | `project.characters` |
| `entities` | legacy/partial | Prefer `map.entities` |

### Blob storage (`@packages/storage`)

Interface `TilesetStorage`: upload/get/delete tileset images **and** generic `uploadFile` / `downloadFile` / `fileExists` / `deleteFile`.

- Prod: Azure Blob (connection string **or** Service Principal).
- Local: Azurite via `AZURE_STORAGE_CONNECTION_STRING`.
- Tests: `InMemoryTilesetStorage` when `NODE_ENV=test` or `USE_IN_MEMORY_STORAGE=true`.
- Default container env: `AZURE_STORAGE_TILESETS_CONTAINER` (compose uses `tilesets`; parser default is `assets` if unset).

Sprite key convention:

```text
users/{userId}/projects/{projectId}/sprites/{spriteId}.{ext}
```

Tileset images use `storageLocation` on the document. The editor **does not** hand SAS URLs to the canvas for CORS reasons: bytes are proxied through

```text
GET /api/projects/:projectId/assets/:kind/:assetId/image
```

(`kind` = `tileset` | `charset`).

Folder moves (`folderPath`) are **document-only**; blob keys do not change.

---

## Auth and API

- **Better Auth** (`better-auth`), not Auth.js. Route: `apps/editor/src/app/api/auth/[...all]/route.ts`.
- Providers in code: email/password in **development only**; magic link (Nodemailer/SMTP). Social providers exist but are commented out.
- Pages under `/projects/*`: cookie gate in `apps/editor/src/proxy.ts`; real check via `requireSession()` (`lib/session.ts`).
- API: `requireApiSession()` → 401; `requireProjectAccess(projectId)` → 401/404/403 (`lib/apiAuth.ts`).
- Client fetches: `lib/apiFetch.ts` (401 → login).

### REST surface (Next.js route handlers)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/projects` | List / create projects for the session user |
| GET/DELETE | `/api/projects/:projectId` | Load / delete project |
| GET/POST | `/api/projects/:projectId/maps` | List / create maps |
| GET/PATCH/DELETE | `/api/projects/:projectId/maps/:mapId` | Map CRUD (layers, tilesetIds, size, …) |
| POST | `.../maps/:mapId/entities` | Add embedded entity |
| PATCH/DELETE | `.../maps/:mapId/entities/:entityId` | Update/remove entity |
| GET/POST | `.../tilesets` | Project tilesets + upload |
| GET/PATCH/DELETE | `.../tilesets/:tilesetId` | Metadata, tiles, name, folderPath |
| POST | `.../tilesets/generate` | Gemini tileset (preview, not persisted as usable until save) |
| POST | `.../tilesets/save-generated` | Persist generated tileset |
| GET/POST | `.../sprites` | Charset library |
| GET/PATCH/DELETE | `.../sprites/:spriteId` | Sprite metadata / folder |
| POST | `.../sprites/generate` | Gemini charset |
| POST | `.../sprites/save-generated` | Persist generated charset |
| GET/POST | `.../characters` | Characters |
| PATCH/DELETE | `.../characters/:characterId` | Character CRUD |
| GET/POST/DELETE | `.../asset-folders` | Declared folders per kind |
| GET | `.../assets/:kind/:assetId/usage` | Delete-safety usage scan |
| GET | `.../assets/:kind/:assetId/image` | Proxied image bytes |
| GET | `.../preview` | Bundle project + maps + tilesets + sprites for the player iframe |
| GET | `/api/tilesets` | Registry (+ project) tileset catalog |
| GET | `/api/projects/:projectId/entities` | Legacy entity collection read |

Contracts for a feature that adds HTTP should be OpenAPI or markdown under `specs/<id>/contracts/`, matching these path shapes and auth errors.

---

## Editor application

**Routes (App Router)**

- `/` landing, `/login`
- `/projects` list
- `/projects/[projectId]/editor` unified editor (primary surface)
- Legacy pages still exist: `/projects/[projectId]`, `.../maps/[mapId]`, `.../characters/[characterId]` — prefer extending the unified editor unless the spec says otherwise.

**Layout** (`components/Editor/EditorLayout.tsx`): vertical ToolBar, Project Explorer + Context panel, center `MapCanvas` (`GameEngine` + overlays), Inspector. Layout widths persist in the client (`useLayoutPersistence`).

**Zustand stores** (`apps/editor/src/stores/`)

| Store | Owns |
|-------|------|
| `editorStore` | Layout, tools (brush/fill/eraser/select/entity/region), paint cursor, dirty/save, active layer, collision overlay, current tileset |
| `mapStore` | Live `Map` document mutations |
| `selectionStore` / `entitySelectionStore` / `tileSelectionStore` | What the inspector shows |
| `viewportStore` | Session camera |
| `projectExplorerStore` | Tree expansion / asset folders UI |
| `entityDataStore` | Entity inspector drafts |

**Engine hook**: `hooks/useMapEngine.ts` — constructs `GameEngine` with `enablePlayerControls: false`, syncs map/tilesets/camera.

**AI generation today**: editor-backend orchestration in `apps/editor/src/lib/generation` (`PromptBuilder` → `GenerationClient` → mandatory `PostProcessor`) plus `POST .../tilesets/generate` and `POST .../tilesets/save-generated`. Providers: Gemini (`GEMINI_API_KEY`, `@google/genai` `gemini-2.5-flash-image`), GPT (`OPENAI_API_KEY`, optional `OPENAI_BASE_URL`, `/v1/images/generations` and `/v1/images/edits`), Claude always `not_supported`. Lineage lives on `tilesets.generation_metadata` (`sourceFamilyIds` / `pairFamilyIds` / `status`). Charset generate still uses `lib/gemini.ts`.

---

## Engine (`packages/core`)

Public exports (`src/index.ts`): `GameEngine`, `GameLoop`, `Renderer`, `InputManager`, `Scene`, `MapRenderer`, `SpriteRenderer`, `EntityRenderer`, `AssetLoader`, `tileRef`, `resolveTileset`, `mapTilesetUsage`, `renderDepth`, `terrainCollision`, `fitOpaqueCollisionRect`.

- `GameEngine.init(project, maps, tilesets, sprites?)` then `start` / `pause` / `resume` / `stop`.
- Camera: `setTransform(zoom, 0, 0, zoom, offsetX, offsetY)` each frame.
- Layer draw order uses `priority` vs actors (`renderDepth.ts`).
- Collision: solid tiles + optional sub-tile `collisionRect`; default player hitbox is half-tile, bottom-centered.
- Tests: colocated `*.test.ts`, runner **Vitest** (`npm run test` in `packages/core`).

---

## Player (`apps/player`)

- Vite app: `main.ts` + `GameLoader.ts`.
- Embedded preview: parent posts `{ type: 'INIT', payload: { project, maps, tilesets, sprites } }` from editor preview modal + `GET .../preview`.
- Standalone: loader fetches JSON URLs (keep this path free of editor/auth code).
- No Mongo, no React, no MUI.

---

## Testing matrix

| Area | Tool | Location |
|------|------|----------|
| Engine / collision / tileRef | Vitest | `packages/core/src/*.test.ts` |
| Editor lib + API | Jest + mongodb-memory-server | `apps/editor/**/*.test.ts` |
| Storage package | Jest | `packages/storage` |
| Editor user flows | Cypress | `apps/editor/cypress/e2e/` (`editor_layout`, `map_flow`, `asset_management`, `asset_generation`, `canvas_viewport`, `preview_flow`, …) |
| Player smoke | Cypress | `apps/player/cypress/` |

New `packages/core` behavior needs unit tests. Critical editor UX needs Cypress. API behavior that touches Mongo should follow existing `*.test.ts` next to the route.

---

## Local development

| Command | What |
|---------|------|
| `npm run dev:infra` (repo root) | Docker: Mongo 27017 + Azurite 10000–10002 |
| `apps/editor` `npm run dev` | Next.js editor (needs `.env.local`) |
| `apps/player` `npm run dev` | Vite player |
| `packages/core` `npm run test` | Vitest |
| `apps/editor` `npm run test` | Jest |
| `npm run copy:blobs` | Copy cloud blobs into Azurite |

Env (editor): `ATLAS_URI`, `ATLAS_DATABASE_NAME`, Azure connection string **or** SP credentials, `AUTH_SECRET` / Better Auth URL, SMTP for magic links, `GEMINI_API_KEY` for Gemini tileset generation, `OPENAI_API_KEY` and optional `OPENAI_BASE_URL` for GPT images. Docker values: `apps/editor/.env.docker.example`, `docker/README.md`.

Node: docs package requires `>=20`.

---

## Performance and product limits (defaults for Scale/Scope)

- Map size UI clamp: **1–500** tiles per side.
- Editor/player target: **~60 FPS** on a filled typical map, not a server QPS number.
- Pixel art: integer zoom, no smoothing; viewport camera is session-only (feature 018).
- One project owner per project; no multiplayer editing.
- Preview is an in-editor iframe of the player, not a separate deploy of game logic.

When a feature is persistence-only, set Performance Goals to “no change to the Canvas loop” rather than inventing a new metric.

---

## Known drift (do not copy into new plans)

These docs lag the code. Prefer this file + the constitution:

- `specs/README.md` and `specs/TECHNICAL_DOCUMENTATION.md` still mention Auth.js/NextAuth and omit features 010–021 and `packages/storage`.
- `AGENTS.md` repo tree omits `packages/storage`.
- `packages/ui` is an empty public API (`export {}`) — editor uses MUI directly.
- Charset generate/save still uses the pre-022 single-shot Gemini helper; tileset families follow constitution VI–XI.

---

## Feature-specific Technical Context checklist

Before marking anything `NEEDS CLARIFICATION`, answer from this file:

- [ ] Which packages change? (types / core / editor / storage / player / docs)
- [ ] New or extended Mongo collection/field? Optional for backward compatibility?
- [ ] Blob key change or document-only (`folderPath` style)?
- [ ] New API route vs extending an existing one?
- [ ] Does the Canvas loop or packed `layer.data` format change?
- [ ] Does `apps/player` need **zero** work? (default yes)
- [ ] Generation feature? Apply gates VI–XI and keep bricks testable.
- [ ] Tests: Vitest vs Jest vs Cypress vs all three
