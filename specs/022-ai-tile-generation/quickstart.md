# Quickstart: AI Tile Generation

Validates **User Story 1** independently (constitution XI): project style + first family, no second family, no transitions.

Prerequisites: `npm run dev:infra` (Mongo + Azurite), editor `.env.local` with `ATLAS_URI` pointing at local Mongo, Azure/Azurite storage, `AUTH_SECRET`, and `GEMINI_API_KEY`. `apps/editor` `npm run dev`.

Shapes and routes: [data-model.md](./data-model.md), [contracts/api-routes.md](./contracts/api-routes.md).

## 1. Style

Open a project with no generated families. Save style: tile size 32, perspective top-down, optional mood.

Expect: reload still shows that style; generate is no longer blocked for missing style.

## 2. First family

Request generate: category `vegetation`, texture description `short dense green grass`, asset name `grass-ground`, folder path `Terrain/Grass`, and generation mode **texture** (vegetation is creator-choice; the toggle must be set). Do not submit a complete free-form image prompt.

Expect: preview PNG whose width and height are **32×32** (one canonical
surface tile). The preview repeats it in an 8×8 scene-test and reports the
self-tiling result. Reject once: Assets list unchanged. Generate again and
**accept**.

Expect: a project tileset with the supplied name and folder path, and `generation_metadata.generationDescription === 'short dense green grass'`. It is usable in the map palette, `generation_metadata.role === 'family'`, `status === 'fresh'`, `generationMode === 'texture'`, and `sourceFamilyIds` empty.

## 3. Surface contract

Inspect the accepted image (inspector or proxied asset URL). It is exactly
32×32, has no leftover margin strip, and the scene-test reveals no seam at its
four repeated edges.

## 4. Unit checks (no live model)

From `apps/editor`:

```bash
npm run test -- promptBuilder postProcessor lineage
```

(Exact file names land in `/speckit-tasks`.) PromptBuilder is deterministic; PostProcessor rejects non-grid input; lineage query returns no dependents for a lone family.

## 5. Out of this quickstart

Charset generate should still open (untouched). Later families, path-autotiles,
transitions, regenerate-with-stale, model selection, and prop background
removal are covered by Stories 2–5 plus Phase 13 in `tasks.md`.

## Validation Results

Recorded 2026-09-22 during `/speckit-implement` of Phases 3–8.

| Check | Result |
| --- | --- |
| `packages/types` `tsc -p tsconfig.json --noEmit` | Pass |
| Editor Jest (`generation`, `promptBuilder`, `postProcessor`, `adjacency`, `lineage`, provider, `project_update`, tileset-detail suites) | Pass — 11 suites, 132 tests |
| ESLint on changed generation/UI/route files | Pass |
| Cypress `asset_generation.cy.ts` | Extended for US1–US5 intercept flows; not executed in this session (no running editor) |
| Editor `next build` | Not run in this session |
| Story 1 manual guide (style → reject → accept 256×256 grass) | Covered by Jest generate/save tests and the Cypress MVP intercept test |

Palette quantization (`png({ palette: true, colours: 32, dither: 0 })`) is enabled: hard-edge and transparency assertions passed.

The results above predate Phase 10 (asset metadata/content separation). The updated route, prompt, type, and Cypress coverage has not been executed yet.

## Phase 13 validation

Recorded 2026-11-13 while aligning the pipeline with one canonical surface tile, the `path-center-edges-corners-v1` atlas, and isolated props.

| Check | Result |
| --- | --- |
| Jest `promptBuilder`, `postProcessor`, `category-config`, `generationTypes`, `debugDump` | Pass — 89 tests |
| Jest `tilesets/generation.test.ts` | Pass — 20 tests |
| Editor `tsc --noEmit` | One pre-existing error in `providers/gpt.ts` (`Uint8Array` vs `BlobPart`); no new errors in the Phase 13 files |
| Cypress `asset_generation.cy.ts` | Updated for the canonical-tile preview, prop scene test, and failed self-tiling review; not executed in this session |
| Live editor scene-test | Not exercised in a browser in this session |
