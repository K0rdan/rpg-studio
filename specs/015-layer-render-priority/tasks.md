# Tasks: Layer Render Priority

## Phase 1: Specification and design

- [x] T001 Create specification and quality checklist.
- [x] T002 Create plan, research, data model, contract, and quickstart.

## Phase 2: Shared model

- [x] T003 Add the backward-compatible priority type and field in `packages/types/src/map.ts`.

## Phase 3: User Story 1 - Natural scenery overlap

- [x] T004 [P] Add depth-order helper tests in `packages/core/src/renderDepth.test.ts`.
- [x] T005 [P] Add priority-pass tests in `packages/core/src/MapRenderer.test.ts`.
- [x] T006 Implement priority rendering in `packages/core/src/MapRenderer.ts`.
- [x] T007 Implement stable actor/tile-row depth ordering in `packages/core/src/renderDepth.ts`.
- [x] T008 Integrate below, same-depth, and above composition in `packages/core/src/GameEngine.ts`.

## Phase 4: User Story 2 - Editor configuration

- [x] T009 Add priority mutation tests in `apps/editor/src/lib/mapLayers.test.ts`.
- [x] T010 Add priority mutation in `apps/editor/src/lib/mapLayers.ts` and `apps/editor/src/stores/mapStore.ts`.
- [x] T011 Add priority selection to `apps/editor/src/components/Editor/Inspector/LayerPanel.tsx`.

## Phase 5: Compatibility and validation

- [x] T012 Verify legacy layers, visibility, focus, entities, and player rendering.
- [x] T013 Run focused tests, lint, and affected package builds.
- [x] T014 Record validation results and complete this task list.

## Dependencies

- T003 precedes renderer and editor implementation.
- T004 and T005 precede T006–T008.
- T009 precedes T010–T011.
- Core and editor work can proceed independently after T003.

## Implementation Strategy

Preserve the current rendering result by default, then add semantic passes and
same-depth ordering, then expose the persisted property in the existing layer panel.

## Validation Results

- Core: 18 files and 83 tests passed.
- Editor layer mutations: 10 tests passed with an isolated Jest configuration.
- Shared types and core TypeScript builds: passed.
- Editor TypeScript check: passed.
- Focused editor ESLint: passed for implementation files.
- IDE diagnostics: no errors in changed implementation files.
- Cypress browser execution was unavailable because the local Cypress 16 binary
  is not installed; the persistence assertion is included for the next E2E run.
