# Quickstart: AI Tile Generation

Validates **User Story 1** independently (constitution XI): project style + first family, no second family, no transitions.

Prerequisites: `npm run dev:infra` (Mongo + Azurite), editor `.env.local` with `ATLAS_URI` pointing at local Mongo, Azure/Azurite storage, `AUTH_SECRET`, and `GEMINI_API_KEY`. `apps/editor` `npm run dev`.

Shapes and routes: [data-model.md](./data-model.md), [contracts/api-routes.md](./contracts/api-routes.md).

## 1. Style

Open a project with no generated families. Save style: tile size 32, perspective top-down, optional mood.

Expect: reload still shows that style; generate is no longer blocked for missing style.

## 2. First family

Request generate: category `vegetation`, label `grass`, generation mode **texture** (vegetation is creator-choice; the toggle must be set). Do not fill a free-form image prompt (control must not exist).

Expect: preview PNG whose width and height are **256×256** (32×8). Preview states individually reusable vs fixed-block. Reject once: Assets list unchanged. Generate again and **accept**.

Expect: a project tileset named from the label, usable in the map palette, `generation_metadata.role === 'family'`, `status === 'fresh'`, `generationMode === 'texture'`, `tilingMode` set, `sourceFamilyIds` empty. `tile_width` remains 32 even if `tilingMode` is `fixed-block`.

## 3. Grid contract

Inspect the accepted image (inspector or proxied asset URL). Every cell is 32×32; no leftover margin strip (PostProcessor crop).

## 4. Unit checks (no live model)

From `apps/editor`:

```bash
npm run test -- promptBuilder postProcessor lineage
```

(Exact file names land in `/speckit-tasks`.) PromptBuilder is deterministic; PostProcessor rejects non-grid input; lineage query returns no dependents for a lone family.

## 5. Out of this quickstart

Charset generate should still open (untouched). Later families, transitions, regenerate-with-stale, model selection, prop background removal, and the fixed-block **stamp** paint path are covered by Stories 2–5 plus Phase 9 in `tasks.md` and `cypress/e2e/asset_generation.cy.ts`.

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
