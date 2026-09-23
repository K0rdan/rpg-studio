# Tasks: AI Tile Generation

**Input**: Design documents from `/specs/022-ai-tile-generation/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`
**Tests**: Jest for shared guards, generation libraries, providers, Mongo/API behavior; Cypress for creator flows. Tests MUST be written and observed failing before their implementation tasks (constitution gate V).

**Organization**: Tasks are grouped by user story. Every accepted image remains an ordinary `Tileset`; charset generation, `packages/core`, and `apps/player` are unchanged.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no incomplete dependency.
- **[Story]**: Maps the task to a user story from `spec.md`.
- Every task names the exact file(s) it changes.

---

## Phase 1: Setup (Shared Test Infrastructure)

**Purpose**: Provide deterministic image bytes for provider and PostProcessor tests without calling live model APIs.

- [x] T001 Create a deterministic in-memory PNG fixture factory for 8×8 tile sheets in `apps/editor/src/lib/generation/__tests__/imageFixtures.ts`

**Checkpoint**: Jest tests can construct valid and malformed PNG inputs without network or checked-in binary fixtures.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish types-first contracts and the provider boundary required by every user story.

**⚠️ CRITICAL**: No route, provider, or UI implementation starts before this phase passes.

- [x] T002 Write failing Jest tests for `isProjectStyleSpec`, `isTileFamilyCategory`, and generation request guards in `apps/editor/src/lib/generation/generationTypes.test.ts`, covering `tileSize` ∈ {16, 32, 64, 128}, `perspective` ∈ {`top-down`, `3/4`}, trimmed optional `mood` ≤ 200 chars, controlled categories, label length 1–64, and malformed values
- [x] T003 Implement and export `ProjectStyleSpec`, `GenerationModelId`, `TileFamilyCategory`, `GenerationRole`, `GenerationStatus`, `GenerationReferenceImage`, `GenerationClientRequest`, `RawGenerationResult`, `GenerationUnavailableReason`, and their guards in `packages/types/src/tileset-generation.ts`, extend optional `TilesetGenerationMetadata` lineage fields there, add `GameProject.styleSpec?` in `packages/types/src/project.ts`, and preserve the re-exports in `packages/types/src/index.ts`
- [x] T004 [P] Define the `GenerationClient` interface, `GenerationUnavailableError`, and provider factory contract without importing any provider SDK in `apps/editor/src/lib/generation/generationClient.ts`
- [x] T005 Verify the new optional shared shapes preserve pre-022 documents by building `packages/types/tsconfig.json` and add any required compile-only compatibility fixture to `apps/editor/src/lib/generation/generationTypes.test.ts`
- [x] T005a Define `GenerationMode`, `TilingMode`, and `ProcessedGenerationResult` (plus optional `generationMode` / `tilingMode` / `selfTilingScore` on `TilesetGenerationMetadata`) in `packages/types/src/tileset-generation.ts`. Do **not** add these fields to `RawGenerationResult`. Extend guards and `apps/editor/src/lib/generation/generationTypes.test.ts`.

**Checkpoint**: Shared types compile; imported and legacy generated tilesets remain valid; `RawGenerationResult` is structurally distinct from `Tileset`.

---

## Phase 3: User Story 1 — Set style and generate the first family (Priority: P1) 🎯 MVP

**Goal**: A creator saves project style, requests a structured first family, reviews it, rejects or accepts it, and receives a fresh usable 8×8 tileset.

**Independent Test**: On a project with no generated family, save 32px/top-down style, request vegetation “grass,” reject once, generate again, accept, reload, and verify a fresh 256×256 usable tileset with no source family ids.

### Tests for User Story 1

- [x] T006 [P] [US1] Write failing deterministic base-prompt tests (same input/output, 8×8 grid, tile size, perspective, optional mood omitted when empty, no client `customPrompt`) in `apps/editor/src/lib/generation/promptBuilder.test.ts`
- [x] T007 [P] [US1] Write failing Gemini provider contract tests for availability, text-only first-family request, PNG extraction, missing key, malformed response, and mapped upstream errors using mocked `@google/genai` in `apps/editor/src/lib/generation/providers/gemini.test.ts`
- [x] T008 [P] [US1] Write failing PostProcessor tests for exact `(tileSize * 8) × (tileSize * 8)` PNG output, nearest-neighbor resize/crop, rejection of invalid images, and no palette quantization yet in `apps/editor/src/lib/generation/postProcessor.test.ts`
- [x] T009 [P] [US1] Write failing PATCH-project route tests for persisting valid `styleSpec`, rejecting invalid size/perspective/mood, requiring at least one supported field, and returning 409 on unconfirmed dimensional style change after an accepted family in `apps/editor/src/app/api/projects/[projectId]/project_update.test.ts`
- [x] T010 [P] [US1] Write failing generate/save route tests for missing style, valid base request, no blob/Mongo write before acceptance, mandatory PostProcessor before preview and save, duplicate normalized category+label conflict, fresh family metadata with empty `sourceFamilyIds`, and rejected previews leaving no document in `apps/editor/src/app/api/projects/[projectId]/tilesets/generation.test.ts`
  - [x] T010a [P] [US1] Write failing Jest tests for `verifySelfTiling(tileBuffer): { passed: boolean; score: number }` in `apps/editor/src/lib/generation/postProcessor.test.ts`, using Test-1-derived fixtures as known-good and a deliberately mismatched crop as known-bad
  - [x] T010b [US1] Implement `verifySelfTiling` in `apps/editor/src/lib/generation/postProcessor.ts`
  - [x] T010c [US1] Implement fixed-block fallback: when verification fails or is skipped, return/persist `tilingMode: 'fixed-block'` without changing `tile_width`/`tile_height`; never present failed texture cells as individually reusable
- [x] T011 [P] [US1] Write the failing Cypress MVP flow with intercepted model responses for save style → generate vegetation/grass → reject → retry → accept → reload → paint from the 32px tileset in `apps/editor/cypress/e2e/asset_generation.cy.ts`
  - [x] T011a [P] [US1] Write failing Jest tests for `removeBackground(imageBuffer)` (alpha threshold / chroma-key against a near-uniform background) in `apps/editor/src/lib/generation/postProcessor.test.ts`, using the Test 2 sample as fixture
  - [x] T011b [US1] Implement `removeBackground` in `apps/editor/src/lib/generation/postProcessor.ts`

### Implementation for User Story 1

- [x] T012 [P] [US1] Implement pure `buildBasePrompt` from structured `ProjectStyleSpec`, category, and label with exact 8×8 sheet instructions in `apps/editor/src/lib/generation/promptBuilder.ts`
- [x] T013 [P] [US1] Implement `GeminiGenerationClient` for `gemini-2.5-flash-image`, returning only `RawGenerationResult` and mapping provider failures in `apps/editor/src/lib/generation/providers/gemini.ts`
- [x] T014 [P] [US1] Implement mandatory crop/grid-snap PostProcessor using `sharp` and nearest-neighbor output in `apps/editor/src/lib/generation/postProcessor.ts`
- [x] T015 [US1] Add authenticated PATCH support for `styleSpec` to `apps/editor/src/app/api/projects/[projectId]/route.ts`, enforcing `mood` trimmed/empty omitted/max 200 and 409 confirmation rules without changing unrelated project fields
- [x] T016 [US1] Replace the tileset branch of the pre-022 Gemini-only generation flow with `PromptBuilder → GenerationClient → PostProcessor`, reject `custom_prompt`, load project `styleSpec`, and return a post-processed non-persisted preview in `apps/editor/src/app/api/projects/[projectId]/tilesets/generate/route.ts`
- [x] T017 [US1] Re-run PostProcessor on untrusted accepted `image_data`, enforce unique normalized family category+label, upload only after validation, and persist role `family`, status `fresh`, category, label, empty `sourceFamilyIds`, prompt/model/timestamp in `apps/editor/src/app/api/projects/[projectId]/tilesets/save-generated/route.ts`
- [x] T018 [US1] Pass `generation_metadata` through tileset list/detail formatting in `apps/editor/src/app/api/projects/[projectId]/tilesets/route.ts` and `apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/route.ts`
- [x] T019 [US1] Replace the free-form style/custom-prompt controls with project style (tile size, perspective, optional mood), controlled category, short label, preview/reject/retry/accept flow in `apps/editor/src/components/TilesetGenerateDialog.tsx`, loading and PATCHing style through the project API while preserving `folderPath`

**Checkpoint**: User Story 1 is fully functional and demoable without another family, transitions, regeneration, or model selection.

---

## Phase 4: User Story 2 — Generate another family in the same visual language (Priority: P2)

**Goal**: A later family is image-conditioned on an accepted family and adjacent categories trigger a transition suggestion.

**Independent Test**: With accepted vegetation/grass, request ground/dirt, verify the Gemini request contains accepted PNG bytes, accept it, use both families independently, and see an adjacency suggestion.

**Depends on**: User Story 1 supplies the first accepted visual reference.

### Tests for User Story 2

- [x] T020 [P] [US2] Extend failing prompt tests for `buildFamilyPrompt` determinism, attached-reference language, ordered reference labels, and structured category/label inputs in `apps/editor/src/lib/generation/promptBuilder.test.ts`
- [x] T021 [P] [US2] Extend failing Gemini provider tests to require each `referenceImages` byte array as an `inlineData` part before the text part and prove references are never dropped into text-only generation in `apps/editor/src/lib/generation/providers/gemini.test.ts`
- [x] T022 [P] [US2] Write failing route tests that reject `stage: family` without an accepted role-family, select the most recently accepted family as reference, download its PNG through `@packages/storage`, send ≥1 image to the provider, return selected `sourceFamilyIds`, and persist them only on accept in `apps/editor/src/app/api/projects/[projectId]/tilesets/generation.test.ts`
- [x] T023 [P] [US2] Write failing unordered category-adjacency tests for every configured proactive pair and all decoration/non-proactive pairs from `research.md` in `apps/editor/src/lib/generation/adjacency.test.ts`
- [x] T024 [P] [US2] Extend the failing Cypress flow for accepting ground/dirt after grass, verifying both remain usable and the proactive transition suggestion appears in `apps/editor/cypress/e2e/asset_generation.cy.ts`

### Implementation for User Story 2

- [x] T025 [P] [US2] Implement `buildFamilyPrompt` without network or provider logic in `apps/editor/src/lib/generation/promptBuilder.ts`
- [x] T026 [P] [US2] Implement image-to-image Gemini content parts from PNG reference bytes in `apps/editor/src/lib/generation/providers/gemini.ts`
- [x] T027 [P] [US2] Implement fixed, unordered common-adjacency lookup for `ground|water|elevation|vegetation|structure|decoration` exactly as decided in `research.md` in `apps/editor/src/lib/generation/adjacency.ts`
- [x] T028 [US2] Extend family generation orchestration to choose only accepted `role: family` references, download image bytes from existing `storageLocation`, enforce ≥1 reference after the first family, and return/persist `sourceFamilyIds` in `apps/editor/src/app/api/projects/[projectId]/tilesets/generate/route.ts` and `apps/editor/src/app/api/projects/[projectId]/tilesets/save-generated/route.ts`
- [x] T029 [US2] Reuse saved style for later-family requests, show accepted reference selection and adjacent-category transition suggestion without exposing free-form prompts in `apps/editor/src/components/TilesetGenerateDialog.tsx`

**Checkpoint**: User Stories 1 and 2 work; every later family uses real accepted image bytes.

---

## Phase 5: User Story 3 — Generate transition tiles (Priority: P3)

**Goal**: A creator explicitly or proactively selects two accepted families and accepts an image-conditioned transition sheet.

**Independent Test**: With two accepted families, generate a transition, verify both PNGs are provider inputs, accept it as a fresh transition, and paint a continuous join; verify fewer than two families is refused.

**Depends on**: User Story 2 supplies two accepted families.

### Tests for User Story 3

- [x] T030 [P] [US3] Extend failing prompt tests for deterministic `buildTransitionPrompt`, both family names/categories, attached-reference instructions, and the same 8×8 geometry in `apps/editor/src/lib/generation/promptBuilder.test.ts`
- [x] T031 [P] [US3] Extend failing route tests for two distinct accepted family ids, sorted unique `pairFamilyIds`, exactly both reference images, refusal below two families, duplicate pair conflict, and fresh transition metadata in `apps/editor/src/app/api/projects/[projectId]/tilesets/generation.test.ts`
- [x] T032 [P] [US3] Extend the failing Cypress flow for explicit and suggested pair selection, transition accept, fewer-than-two refusal, and transition availability in the map palette in `apps/editor/cypress/e2e/asset_generation.cy.ts`

### Implementation for User Story 3

- [x] T033 [P] [US3] Implement pure `buildTransitionPrompt` with edge/join instructions and both family descriptors in `apps/editor/src/lib/generation/promptBuilder.ts`
- [x] T034 [US3] Extend the existing generate route with `stage: transition`, validate both accepted family ids, load both images, and pass them to the selected client in `apps/editor/src/app/api/projects/[projectId]/tilesets/generate/route.ts`
- [x] T035 [US3] Extend the existing save route (do not create parallel transition routes) to persist role `transition`, sorted `[string, string]` `pairFamilyIds`, both `sourceFamilyIds`, status `fresh`, and one transition per unordered pair in `apps/editor/src/app/api/projects/[projectId]/tilesets/save-generated/route.ts`
- [x] T036 [US3] Add explicit pair picker and wire the adjacency suggestion into transition preview/retry/accept in `apps/editor/src/components/TilesetGenerateDialog.tsx`

**Checkpoint**: User Stories 1–3 produce a mappable set of families and transition tiles through the same routes.

---

## Phase 6: User Story 4 — Regenerate with impact awareness (Priority: P4)

**Goal**: Regeneration lists direct dependents before generation; acceptance preserves the tileset id, refreshes it, and marks direct dependents stale without regenerating them.

**Independent Test**: With two families and a transition, start base-family regeneration, inspect dependents, cancel with no changes, then regenerate/accept and verify same family id + fresh status while the untouched transition becomes stale and stays usable.

**Depends on**: User Story 3 supplies the complete dependent scenario.

### Tests for User Story 4

- [x] T037 [P] [US4] Write failing Mongo-backed tests for project-scoped direct `findDependents`, source/pair matching, no transitive traversal, and `markDependentsStale` in `apps/editor/src/lib/generation/lineage.test.ts`
- [x] T038 [P] [US4] Extend failing tileset-detail route tests so GET returns plain-language direct `dependents[]` with id/name/role/status and never leaks another project’s graph in `apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/tileset.test.ts`
- [x] T039 [P] [US4] Extend failing save-generation tests for same-id/blob replacement, fresh regenerated metadata, direct-only stale marking, unchanged dependent image bytes, no `project.tilesets` reorder/push, and cancel/no-save behavior in `apps/editor/src/app/api/projects/[projectId]/tilesets/generation.test.ts`
- [x] T040 [P] [US4] Extend the failing Cypress flow to show dependents before generation confirmation, cancel unchanged, accept same-id replacement, display a stale badge, keep stale tiles paintable, and never auto-regenerate in `apps/editor/cypress/e2e/asset_generation.cy.ts`

### Implementation for User Story 4

- [x] T041 [P] [US4] Implement project-scoped `findDependents` and non-transitive `markDependentsStale` using string foreign ids and ObjectId only for `_id` updates in `apps/editor/src/lib/generation/lineage.ts`
- [x] T042 [US4] Include `generation_metadata` plus direct `dependents[]` in project tileset detail GET and create the two idempotent project+lineage indexes specified by `data-model.md` in `apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/route.ts`
- [x] T043 [US4] Support `regenerateTilesetId` in the generate route while preserving the original until acceptance and reusing its current lineage references in `apps/editor/src/app/api/projects/[projectId]/tilesets/generate/route.ts`
- [x] T044 [US4] Support atomic regenerate acceptance in the save route: replace the same tileset blob/metadata as fresh, mark direct dependents stale, never append/reorder `project.tilesets`, and never cascade in `apps/editor/src/app/api/projects/[projectId]/tilesets/save-generated/route.ts`
- [x] T045 [US4] Fetch and display dependents before starting regeneration, add cancel/confirm flow, and show non-blocking stale badges in `apps/editor/src/components/TilesetGenerateDialog.tsx`, `apps/editor/src/components/Editor/ProjectExplorer/AssetsTree.tsx`, and `apps/editor/src/components/Editor/ProjectExplorer/AssetFolderSection.tsx`

**Checkpoint**: User Stories 1–4 work; lineage impact is visible before mutation and stale status is informational only.

---

## Phase 7: User Story 5 — Choose the AI model (Priority: P5)

**Goal**: A project default and one-request override select among available models; GPT generates pixels, Gemini remains supported, and Claude is clearly unavailable.

**Independent Test**: Save Gemini as default, override one request with GPT without changing the default, then select Claude/unconfigured/quota-limited providers and receive clear no-preview refusal.

**Depends on**: Foundational + User Story 1; can be developed in parallel with Stories 2–4 after the Gemini MVP.

### Tests for User Story 5

- [x] T046 [P] [US5] Write failing GPT provider tests for `/v1/images/generations` without references, multipart `/v1/images/edits` with 1–16 PNG references and `input_fidelity=high`, `b64_json` decoding, `rate_limit_exceeded`, `insufficient_quota`, misconfiguration, and upstream errors in `apps/editor/src/lib/generation/providers/gpt.test.ts`
- [x] T047 [P] [US5] Write failing Claude adapter tests proving `isAvailable() === false` and `generate()` throws `not_supported` without any Anthropic HTTP request in `apps/editor/src/lib/generation/providers/claude.test.ts`
- [x] T048 [P] [US5] Extend failing project PATCH and generation route tests for optional `generationModel`, Gemini default fallback, per-request override without persistence, 409 not_supported/misconfigured/quota, 429 rate_limit, 502 upstream, and no usable preview/save on failure in `apps/editor/src/app/api/projects/[projectId]/project_update.test.ts` and `apps/editor/src/app/api/projects/[projectId]/tilesets/generation.test.ts`
- [x] T049 [P] [US5] Extend the failing Cypress flow for saving a project default, one-off GPT override, unchanged default after reload, and clear unavailable-model refusal in `apps/editor/cypress/e2e/asset_generation.cy.ts`

### Implementation for User Story 5

- [x] T050 [P] [US5] Implement the dependency-minimal OpenAI/Azure-compatible GPT image client with configurable base URL/key, generations vs edits selection, multipart references, and mapped errors in `apps/editor/src/lib/generation/providers/gpt.ts`
- [x] T051 [P] [US5] Implement the explicit unsupported Claude adapter without an Anthropic dependency in `apps/editor/src/lib/generation/providers/claude.ts`
- [x] T052 [US5] Add `GameProject.generationModel?` validation/persistence to `packages/types/src/project.ts`, `packages/types/src/tileset-generation.ts`, and authenticated PATCH in `apps/editor/src/app/api/projects/[projectId]/route.ts`
- [x] T053 [US5] Implement provider selection/default fallback and consistent `GenerationUnavailableError` HTTP mapping in `apps/editor/src/lib/generation/generationClient.ts` and `apps/editor/src/app/api/projects/[projectId]/tilesets/generate/route.ts`
- [x] T054 [US5] Add project-default and per-generation model selectors with availability/error messaging in `apps/editor/src/components/TilesetGenerateDialog.tsx`

**Checkpoint**: All five user stories are independently testable; unavailable providers never bypass image anchoring.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Optional palette tightening, compatibility regression coverage, documentation, and final verification.

- [x] T055 [P] Write failing palette-output tests for 32 colours, `dither: 0`, transparency, exact dimensions, and preserved hard pixel edges in `apps/editor/src/lib/generation/postProcessor.test.ts`
- [x] T056 Implement the deferred `sharp(...).png({ palette: true, colours: 32, dither: 0 })` PostProcessor step only if T055’s visual assertions pass; otherwise document deferral without adding another binary in `apps/editor/src/lib/generation/postProcessor.ts`
- [x] T057 [P] Add regression tests proving imported tilesets and pre-022 `{ generated, style, prompt, generated_at }` metadata remain visible, usable, and excluded from automatic lineage references in `apps/editor/src/app/api/projects/[projectId]/tilesets/generation.test.ts`
- [x] T058 Run and record the complete Story 1 validation guide, Jest suites, Cypress flow, type build, lint, and editor build results under a `Validation Results` section in `specs/022-ai-tile-generation/quickstart.md`
- [x] T059 Update the implemented generation surface, provider availability, environment keys, and remove the pre-022 known-drift statement in `.specify/memory/technical-context.md`

---

## Phase 9: Texture / prop modes and fixed-block stamp (spec increment)

**Purpose**: Close FR-017–FR-020 after the data-model update. Depends on T005a and T010a–T011b. No `packages/core` / `apps/player` changes.

- [x] T060 [P] [US1] Add `CATEGORY_MODE` and `resolveGenerationMode(category, requested?)` with implied vs creator-choice vs transition-always-texture rules in `apps/editor/src/lib/generation/category-config.ts` and tests in `apps/editor/src/lib/generation/category-config.test.ts`
- [x] T061 [US1] Extend `buildBasePrompt` / `buildFamilyPrompt` with required `generationMode` (texture wrap vs prop isolated object + flat background) and keep `buildTransitionPrompt` texture-only in `apps/editor/src/lib/generation/promptBuilder.ts` and `promptBuilder.test.ts`
- [x] T062 [US1] Orchestrate `postProcessGeneratedImage` after crop in generate and save: validate `generationMode`, recompute `tilingMode`/`selfTilingScore` server-side, return them on `generation_params`, persist them on accept in `apps/editor/src/app/api/projects/[projectId]/tilesets/generate/route.ts`, `save-generated/route.ts`, and `generation.test.ts`
- [x] T063 [US1] Show a texture/prop toggle only for creator-choice categories, hide it for implied ones, and state individually reusable vs fixed-block stamp before accept in `apps/editor/src/components/TilesetGenerateDialog.tsx`
- [x] T064 [US1] Treat `tilingMode: 'fixed-block'` as one palette swatch; brush paints an 8×8 GID stamp from the click (clipped to the map); disable fill for that tileset; keep per-cell picking for `individual` and for tilesets without `tilingMode` in `apps/editor/src/components/Editor/TilePalette/TileGrid.tsx` and the map paint handler that consumes the selected tile
- [x] T065 [US1] Extend Cypress `apps/editor/cypress/e2e/asset_generation.cy.ts` so vegetation/grass sends `generationMode: 'texture'`, a prop path strips background, and a failed self-tiling preview shows the stamp message without changing tile size

**Checkpoint**: Modes, verification, matte, and stamp UX match data-model.md and `contracts/post-processor.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on T001 and blocks all stories.
- **US1 (Phase 3)**: Depends on Foundational; MVP.
- **US2 (Phase 4)**: Depends on an accepted US1 family.
- **US3 (Phase 5)**: Depends on two accepted families from US2.
- **US4 (Phase 6)**: Scenario 1 can start after US1; full impact scenario depends on US3.
- **US5 (Phase 7)**: Depends only on Foundational + working US1 Gemini flow; may run alongside US2–US4.
- **Polish (Phase 8)**: Runs after the desired story scope; quantization is not a release blocker under FR-009.
- **Phase 9 (texture/prop)**: Can start after US1 generate/save exist; required before calling FR-017–FR-020 done.

### User Story Dependency Graph

```text
Setup → Foundation → US1 (MVP) → US2 → US3 → US4
                         └──────────────→ US5
All selected stories ──────────────────→ Polish
```

### Within Each User Story

- Write and observe failing tests before implementation.
- Shared types precede library/provider code.
- Pure libraries/providers precede route orchestration.
- Routes precede UI completion.
- Cypress proves the independently testable creator outcome at each checkpoint.

### Parallel Opportunities

- Foundational T004 can run alongside T002/T003 once names are agreed; T003 still waits for failing T002.
- US1 test tasks T006–T011 can run in parallel; implementation tasks T012–T014 can then run in parallel.
- US2 tests T020–T024 and implementations T025–T027 target separate files and can run in parallel.
- US3 tests T030–T032 can run in parallel; T033 can proceed independently before route integration.
- US4 tests T037–T040 can run in parallel; T041 can run separately from UI work after tests fail.
- US5 tests T046–T049 and provider implementations T050–T051 are independent.

---

## Parallel Execution Examples

### User Story 1

```text
T006 promptBuilder tests
T007 Gemini provider tests
T008 PostProcessor tests
T009 project PATCH tests
T010 generation route tests
T011 Cypress MVP flow
```

### User Story 2

```text
T020 family prompt tests
T021 Gemini image-reference tests
T022 family route tests
T023 adjacency tests
T024 Cypress second-family flow
```

### User Story 3

```text
T030 transition prompt tests
T031 transition route tests
T032 Cypress transition flow
```

### User Story 4

```text
T037 lineage tests
T038 detail-route dependents tests
T039 regenerate-save tests
T040 Cypress impact/stale flow
```

### User Story 5

```text
T046 GPT provider tests
T047 Claude unavailable tests
T048 project/route model tests
T049 Cypress model-selection flow
```

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T019.
3. Stop and run `specs/022-ai-tile-generation/quickstart.md`.
4. Demo style persistence, reject-without-save, accepted fresh family, exact grid, and ordinary map use.

### Incremental Delivery

1. **US1**: First accepted family.
2. **US2**: Image-anchored later families + suggestions.
3. **US3**: Two-family transition sheets.
4. **US4**: Safe regeneration and stale lineage.
5. **US5**: Provider choice and consistent availability UX.
6. **Polish**: Quantization only after hard-edge tests pass.

---

## Notes

- Existing generate/save paths are extended; do not add parallel transition routes.
- PostProcessor runs before preview and again before accepted persistence.
- Rejected previews never become blobs, documents, or references.
- `sourceFamilyIds` and `pairFamilyIds` contain string ids; `ObjectId` is used only for `_id` queries.
- Never reorder `project.tilesets` or map `tilesetIds`.
- Charset generation remains on its existing flow and is out of scope.
