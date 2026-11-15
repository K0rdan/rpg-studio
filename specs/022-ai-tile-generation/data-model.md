# Data Model: AI Tile Generation

**Feature**: 022-ai-tile-generation
**Depends on**: `packages/types/src/tileset.ts`, `packages/types/src/project.ts` (existing)

## Design principle

No new Mongo collection. This feature extends two existing documents
with optional fields only, per the project's backward-compatibility
constraint (existing tilesets/projects without these fields remain
valid and are treated as creator-imported / unstyled).

---

## `Tileset.generation_metadata` (extended)

**File**: `packages/types/src/tileset.ts` (or a new
`packages/types/src/tileset-generation.ts` if kept separate from the
base `Tileset` shape — follow existing file convention for
`generation_metadata`).

Shared names match `packages/types/src/tileset-generation.ts`
(`TileFamilyCategory`, `GenerationModelId`, `ProjectPerspective`). Do
not introduce parallel aliases (`Perspective`, `GenerationProvider`,
`ModelPreference`).

```typescript
export type GenerationMode = 'texture' | 'path-autotile' | 'prop';

export type TilingMode = 'individual' | 'fixed-block';

/** Declared only when generationMode is 'path-autotile'. It identifies the
 * slot geometry and neighbour-validation rules of the atlas. */
export type PathAutotileLayoutId = string;

export interface TilesetGenerationMetadata {
  generated: boolean;
  style?: TilesetStyle;
  prompt?: string;
  generated_at?: Date;
  model?: GenerationModelId;
  role?: GenerationRole;
  category?: TileFamilyCategory;
  /** Legacy metadata; not a generation subject. */
  label?: string;
  /** Concise requested material/object content, used for regeneration. */
  generationDescription?: string;
  status?: GenerationStatus;
  sourceFamilyIds?: string[];
  pairFamilyIds?: [string, string];

  /** 'texture' = one continuous self-tiling material;
   *  'path-autotile' = a topology-aware atlas for one parent material;
   *  'prop' = isolated object; background removed locally (FR-017/020). */
  generationMode?: GenerationMode;

  /** Required for a path-autotile; identifies its source surface material. */
  parentMaterialId?: string;

  /** Required for a path-autotile; names its versioned atlas topology. */
  pathAutotileLayoutId?: PathAutotileLayoutId;

  /** Legacy presentation metadata. New surface textures are individually
   *  reusable as one canonical tile; it is not a fallback for a failed
   *  self-tiling result. */
  tilingMode?: TilingMode;

  /** Diagnostic 0–1 from surface self-tiling verification. Not shown raw in
   *  the UI; omitted for prop and replaced by slot diagnostics for autotiles. */
  selfTilingScore?: number;

  /** Path-autotile slots that passed neighbour checks and may be painted. */
  passedSlotIds?: string[];
}
```

`RawGenerationResult` stays provider output only (`mimeType`, `bytes`,
`model`). Mode and tiling are **not** provider fields. After
PostProcessor, the route holds a `ProcessedGenerationResult`:

```typescript
export interface ProcessedGenerationResult {
  mimeType: 'image/png';
  bytes: Uint8Array;
  generationMode: GenerationMode;
  tilingMode: TilingMode;
  selfTilingScore?: number;
  reviewPassed: boolean;
  pathAutotileLayoutId?: PathAutotileLayoutId;
  parentMaterialId?: string;
  passedSlotIds?: string[];
}
```

**Compatibility**: every field above is optional. A `Tileset` created
by the pre-022 single-shot flow (or by manual import) has
`generation_metadata` absent or with only `{ generated, style,
prompt, generated_at }` — it renders and behaves exactly as before.
Absence of `category`/`role` means "not part of the 022 lineage
system"; such tilesets are excluded from adjacency suggestions and
dependent lookups. Asset `name` and `folderPath` are organization fields;
`generationDescription` is the functional content request. Legacy
`label` metadata is never used in new prompts. Absence of
`generationMode`/`tilingMode` means
the palette stays per-cell (imported and pre-022 generated sheets).

---

## `GameProject.styleSpec` (new)

**File**: `packages/types/src/project.ts`

Already implemented:

```typescript
export interface ProjectStyleSpec {
  tileSize: TileSize; // 16 | 32 | 64 | 128
  perspective: ProjectPerspective; // 'top-down' | '3/4'
  mood?: string;
}
```

Added as `GameProject.styleSpec?: ProjectStyleSpec` — optional,
absent on existing projects until a creator saves one (spec FR-001).

---

## `GameProject.generationModel` (User Story 5)

Keep the existing optional scalar. Do **not** introduce
`modelPreference` / `defaultProvider`.

```typescript
generationModel?: GenerationModelId; // 'gemini' | 'gpt' | 'claude'
```

If omitted, server default is Gemini when configured, else the first
`isAvailable()` provider (research.md). Per-request override is
`model` on `POST .../tilesets/generate` only — never persisted.

---

## Category → mode mapping (config, not a new persisted type)

Lives as a plain constant in `apps/editor/src/lib/generation/`
(not `packages/types`, since it is generation-workflow configuration,
not a shared game/editor contract):

```typescript
// apps/editor/src/lib/generation/category-config.ts

export const CATEGORY_MODE: Record<
  TileFamilyCategory,
  GenerationMode | 'creator-choice'
> = {
  ground: 'texture',
  water: 'texture',
  decoration: 'prop',
  elevation: 'creator-choice',
  vegetation: 'creator-choice',
  structure: 'creator-choice',
};
```

`'creator-choice'` categories surface a mode toggle in the request UI
(per FR-017). `ground` / `water` / `decoration` have no toggle — the
mode is implied.

**Request rules** (generate + save):

- Implied category: server assigns the mapped mode. If the client
  sends a conflicting `generationMode` → **400**.
- `creator-choice`: client MUST send `texture` or `prop` → **400** if
  missing or any other mode except `path-autotile`.
- `path-autotile` is available for every category except `decoration`,
  and only when `parentMaterialId` identifies an accepted surface
  family. A missing or non-surface parent → **400**.
- `stage: transition` is always an explicit edge/join atlas processed
  with `generationMode: 'texture'`. It is not a single surface tile.
  Client `generationMode` is ignored.

**Geometry is mode-specific**: a `texture` family is one
`tileSize × tileSize` canonical image; a failed self-tiling result is a
review failure (`reviewPassed: false`) and MUST NOT be saved or
repackaged as `fixed-block`. A `path-autotile` uses layout
`path-center-edges-corners-v1` (centre, four edges, four outer corners;
no junctions). A prop is one isolated object. Transition sheets stay an
explicit 8×8 edge/join atlas. The editor uses persisted mode, layout,
and `passedSlotIds` to decide which cells the palette offers.

---

## Derived queries (no new index required beyond what's noted)

### Find dependents of a family (spec FR-011)

```
db.tilesets.find({
  projectId,
  $or: [
    { 'generation_metadata.sourceFamilyIds': familyId },
    { 'generation_metadata.pairFamilyIds': familyId },
  ],
})
```

Recommend a compound index on
`{ projectId: 1, 'generation_metadata.sourceFamilyIds': 1 }` and a
second on `{ projectId: 1, 'generation_metadata.pairFamilyIds': 1 }`
if query volume ever justifies it; not required at current expected
scale (single-user projects, tens of families per project).

### Find candidate pairs for adjacency suggestion (spec FR-007a)

```
db.tilesets.find({
  projectId,
  'generation_metadata.role': 'family',
  'generation_metadata.category': { $in: adjacentCategoriesOf(x) },
})
```

`adjacentCategoriesOf` is a pure function over the same kind of fixed
config as `CATEGORY_MODE`, not a database concept.

---

## State transitions summary

| Event                                    | Effect                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| First family accepted                    | `status: 'fresh'`, `role: 'family'`, no `sourceFamilyIds`; `generationMode` / `tilingMode` set from the processed preview |
| Later family accepted                    | `status: 'fresh'`, `role: 'family'`, `sourceFamilyIds` set; same mode fields as above |
| Transition accepted                      | `status: 'fresh'`, `role: 'transition'`, `pairFamilyIds` set; `generationMode: 'texture'` |
| Family/transition regenerated & accepted | its own `status → 'fresh'`, all dependents (found via the query above) `status → 'stale'`; mode/tiling rewritten from the new processed result |
| Stale element viewed/used                | no status change; stale is informational only (spec FR-014, Assumptions)                  |
| Stale element regenerated & accepted     | its own `status → 'fresh'`; does not affect other stale elements                          |
