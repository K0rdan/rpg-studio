# Implementation Plan: AI Tile Generation

**Branch**: `022-ai-tile-generation` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-ai-tile-generation/spec.md`

**Note**: `setup-plan.sh` did not copy this file (repo was on `main`, not a `NNN-*` feature branch). Artifacts were written directly under `specs/022-ai-tile-generation/` from `.specify/feature.json`.

## Summary

Replace the pre-022 single-shot Gemini tileset flow with a native editor-backend pipeline: project style (`ProjectStyleSpec`), deterministic `PromptBuilder` (texture vs prop), interchangeable `GenerationClient` providers, and a mandatory `PostProcessor` (crop + grid-snap + self-tiling or background removal). Accepted results remain ordinary `Tileset` documents with optional lineage and `generationMode` / `tilingMode` on `generation_metadata`. User Story 1 (style + first family) ships before later families, transitions, stale marking, or extra providers.

## Technical Context

**Language/Version**: TypeScript ~6, strict mode (`any` only with documented justification)
**Primary Dependencies**: Next.js 16 App Router, React 19, MUI 9, Zustand 5, MongoDB Node driver 7, Better Auth, `@packages/types`, `@packages/storage`; `sharp` for PostProcessor (crop, grid-snap, palette, self-tiling edge compare, prop matte); `@google/genai` for Gemini; thin HTTP client for OpenAI Images (`/v1/images/generations` and `/v1/images/edits`). Claude has no image-generation API — adapter reports unavailable (see research.md). No `@packages/core` / player deps.
**Storage**: MongoDB. No new collection. Extends `tilesets.generation_metadata` with optional lineage/status/category/label/role plus `generationMode` / `tilingMode` / `selfTilingScore`. Optional `GameProject.styleSpec` and `GameProject.generationModel` on `projects` (not `modelPreference`). Images via `@packages/storage` (Azure Blob/Azurite), same `storageLocation` convention. Existing tilesets without the new fields remain valid imported assets.
**Testing**: Jest (+ `@shelf/jest-mongodb`) in `apps/editor` for PromptBuilder, GenerationClient providers (mocked HTTP), PostProcessor, lineage/stale-marking; Cypress in `apps/editor/cypress/e2e/asset_generation.cy.ts` for accept/reject/regenerate. No Vitest/`packages/core` work. TDD: tests before implementation (gate V).
**Target Platform**: `apps/editor` (Next.js web app) only. Generated tiles are ordinary `Tileset` documents; player loading path unchanged.
**Project Type**: Turborepo npm workspaces; feature lives in `apps/editor` with shared shapes in `packages/types`.
**Performance Goals**: No change to the Canvas loop (persistence + API, not rendering).
**Constraints**: Constitution I–XI; gates VI–XI apply. Types first. All new document fields optional; never rewrite `tilesetIds` ordering. Pipeline stays in `apps/editor` backend (no n8n/Make). Replaces `lib/gemini.ts` tileset path + `tilesets/generate` + `tilesets/save-generated`; charset generate routes stay on the pre-022 Gemini helper until a later spec.
**Scale/Scope**: Single-user project ownership. Touches `packages/types`, `apps/editor/src/lib` (generation bricks), `apps/editor/src/app/api` (generate/save + PATCH project), generation UI, Cypress `asset_generation`. No `packages/core`, no `apps/player`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #    | Gate                            | Status | Evidence                                                                                                                                                                                                           |
| ---- | ------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I    | Types first                     | PASS   | `ProjectStyleSpec`, lineage fields, category enum, `RawGenerationResult`, request types land in `packages/types` before routes/UI                                                                                  |
| II   | Core agnosticism                | N/A    | No `packages/core` changes                                                                                                                                                                                         |
| III  | Lightweight player              | N/A    | No `apps/player` changes                                                                                                                                                                                           |
| IV   | Native Canvas                   | N/A    | No rendering change                                                                                                                                                                                                |
| V    | TDD                             | PASS   | Jest for bricks + lineage; Cypress for creator flows; tests before implementation                                                                                                                                  |
| VI   | Native generation orchestration | PASS   | Sequencing in `apps/editor` API/lib only; no external workflow tool                                                                                                                                                |
| VII  | Image-to-image anchoring        | PASS   | `GenerationRequest` after first family requires `referenceImages.length >= 1`; Gemini + GPT adapters send those bytes; Claude cannot generate pixels and MUST surface unavailable rather than text-only style lock |
| VIII | Generation brick split          | PASS   | Four units: style on project types, `GenerationClient`, `PromptBuilder`, `PostProcessor` — separate modules, no prompt construction inside providers                                                               |
| IX   | Post-processing                 | PASS   | Route MUST run PostProcessor before preview JSON or save; `RawGenerationResult` is never a `Tileset`; texture runs self-tiling (fixed-block fallback); prop runs local background removal |
| X    | Reference traceability          | PASS   | `sourceFamilyIds` / `pairFamilyIds` written at accept; dependents query on those fields                                                                                                                            |
| XI   | Independently testable stages   | PASS   | Story 1 complete before Story 2 code; transitions and regenerate are later tasks                                                                                                                                   |

Post-design re-check: still PASS. Claude-as-unavailable is FR-015, not a gate VII bypass.

## Project Structure

### Documentation (this feature)

```text
specs/022-ai-tile-generation/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
└── tasks.md             # Phase 2 — not created by /speckit.plan
```

### Source Code (repository root)

```text
packages/types/src/project.ts
packages/types/src/tileset-generation.ts
packages/types/src/tileset.ts                 # still optional generation_metadata

apps/editor/src/lib/generation/promptBuilder.ts
apps/editor/src/lib/generation/generationClient.ts
apps/editor/src/lib/generation/postProcessor.ts
apps/editor/src/lib/generation/category-config.ts
apps/editor/src/lib/generation/lineage.ts
apps/editor/src/lib/generation/adjacency.ts
apps/editor/src/lib/generation/providers/gemini.ts
apps/editor/src/lib/generation/providers/gpt.ts
apps/editor/src/lib/generation/providers/claude.ts
apps/editor/src/lib/gemini.ts                 # charset helpers remain; tileset prompt/client move out

apps/editor/src/app/api/projects/[projectId]/route.ts
apps/editor/src/app/api/projects/[projectId]/tilesets/generate/route.ts
apps/editor/src/app/api/projects/[projectId]/tilesets/save-generated/route.ts
apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/route.ts

apps/editor/src/components/TilesetGenerateDialog.tsx
apps/editor/src/components/Editor/…            # style spec + stale flag surfaces in explorer/inspector

apps/editor/cypress/e2e/asset_generation.cy.ts
```

**Structure Decision**: Shared shapes in `packages/types`. Generation bricks and HTTP in `apps/editor`. Runtime/player untouched. Charset generate stays on the existing Gemini helper until a dedicated spec.

## Complexity Tracking

> No constitution violations.

## Phase 0 / Phase 1

See `research.md`, `data-model.md`, `contracts/`, `quickstart.md`.

## Task generation approach (for `/speckit-tasks`)

Ordered so each spec user story ships independently (gate XI):

1. `packages/types`: `ProjectStyleSpec`, `TileFamilyCategory`, lineage fields, `GenerationMode`, `TilingMode`, `ProcessedGenerationResult` (not on `RawGenerationResult`), `RawGenerationResult` — type-level tests/guards
2. Self-tiling verification algorithm: compare opposing edge pixel bands of an extracted tile (left vs right, top vs bottom) using a similarity metric (e.g. mean absolute difference in a perceptual or RGB space) against a calibrated threshold. Research: threshold calibration using the Test 1 sample as a known-good reference, validate false-positive/false-negative rate before hardcoding a cutoff. Output feeds FR-018/FR-019 fallback decision. No model retry from PostProcessor.
   2b. Background removal for prop mode: alpha threshold vs chroma-key against the generated background color — validate against Test 2 sample; `sharp` supports basic threshold-based alpha extraction, confirm it is sufficient before considering a dedicated background-removal library.
   2c. `CATEGORY_MODE` config + `resolveGenerationMode`; PromptBuilder texture vs prop; generate/save persist mode/tiling; UI toggle; palette stamp for `fixed-block` (editor only, no core).
3. GenerationClient interface + Gemini provider (mocked HTTP) — first family, text-only refs allowed
4. PostProcessor crop + grid-snap via `sharp` (quantization deferred)
5. Extend `tilesets/generate` + `save-generated` + PATCH project `styleSpec` — User Story 1
6. Style spec UI + first-family flow; Cypress independent test for Story 1
7. PromptBuilder family template + required references + Gemini i2i — User Story 2
8. Transition prompt + pair refs + adjacency suggestions — User Story 3
9. Dependents lookup + regenerate + stale marking — User Story 4
10. GPT provider + model preference (project default + override); Claude adapter returns unavailable — User Story 5
11. PostProcessor palette quantization increment (FR-009)
