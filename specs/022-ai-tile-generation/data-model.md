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
export type GenerationMode = 'texture' | 'prop';

export type TilingMode = 'individual' | 'fixed-block';

export interface TilesetGenerationMetadata {
  generated: boolean;
  style?: TilesetStyle;
  prompt?: string;
  generated_at?: Date;
  model?: GenerationModelId;
  role?: GenerationRole;
  category?: TileFamilyCategory;
  label?: string;
  status?: GenerationStatus;
  sourceFamilyIds?: string[];
  pairFamilyIds?: [string, string];

  /** 'texture' = continuous self-tiling material.
   *  'prop' = isolated object; background removed locally (FR-017/020). */
  generationMode?: GenerationMode;

  /** texture (and transitions) only. 'individual' = each cell is a
   *  reusable self-tiling-verified tile. 'fixed-block' = fallback:
   *  the 8×8 sheet is one non-decomposable stamp (FR-019). */
  tilingMode?: TilingMode;

  /** Diagnostic 0–1 from self-tiling verification. Not shown raw in
   *  the UI. Texture / transition only; omitted for prop. */
  selfTilingScore?: number;
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
}
```

**Compatibility**: every field above is optional. A `Tileset` created
by the pre-022 single-shot flow (or by manual import) has
`generation_metadata` absent or with only `{ generated, style,
prompt, generated_at }` — it renders and behaves exactly as before.
Absence of `category`/`role` means "not part of the 022 lineage
system"; such tilesets are excluded from adjacency suggestions and
dependent lookups. Absence of `generationMode`/`tilingMode` means
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
- `creator-choice`: client MUST send `generationMode` → **400** if
  missing or not `texture` | `prop`.
- `stage: transition` is always processed as `texture` (edge/join
  sheet). Client `generationMode` is ignored; persisted metadata
  records `generationMode: 'texture'`.

**Fixed-block placement (FR-019)**: do not change `tile_width` /
`tile_height` (they stay `styleSpec.tileSize`) and do not change
`packages/core`. The image remains an 8×8 atlas so the player can
blit cells. The **palette** treats `tilingMode: 'fixed-block'` as one
stamp: one swatch; the brush writes the full 8×8 cell pattern from the
clicked map cell (clipped to bounds). Fill is disabled for that
tileset this iteration. Individual cells are not pickable.
`individual` keeps today’s per-cell palette and fill.

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
