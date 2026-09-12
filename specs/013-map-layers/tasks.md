# Tasks: Map Layers

## Phase 1: Setup

- [x] T001 Create feature specification and design artifacts in `specs/013-map-layers/`

## Phase 2: Foundational

- [x] T002 Add the backward-compatible visibility field in `packages/types/src/map.ts`
- [x] T003 [P] Add pure layer operations and tests in `apps/editor/src/lib/mapLayers.ts` and `apps/editor/src/lib/mapLayers.test.ts`
- [x] T004 Integrate layer mutations into `apps/editor/src/stores/mapStore.ts`

## Phase 3: User Story 1 - Paint independent layers

**Independent Test**: Add and select a second layer, paint, and verify only its tile data changes.

- [x] T005 [US1] Reset or clamp active-layer selection during map changes in `apps/editor/src/hooks/useMapEngine.ts`
- [x] T006 [US1] Build layer creation and selection UI in `apps/editor/src/components/Editor/Inspector/LayerPanel.tsx`
- [x] T007 [US1] Integrate the panel with current map properties in `apps/editor/src/components/Editor/ContextPanel/MapProperties.tsx`
- [x] T008 [US1] Verify default layer creation through tests for `apps/editor/src/app/api/projects/[projectId]/maps/route.ts`

## Phase 4: User Story 2 - Organize layers

**Independent Test**: Rename, reorder, and delete layers while preserving order and a valid active selection.

- [x] T009 [US2] Add rename, move, and protected delete controls in `apps/editor/src/components/Editor/Inspector/LayerPanel.tsx`
- [x] T010 [US2] Resize every layer when map dimensions change in `apps/editor/src/components/Editor/ContextPanel/MapProperties.tsx`

## Phase 5: User Story 3 - Control visibility

**Independent Test**: Hide, save, reload, and reveal a layer without changing its tile data.

- [x] T011 [P] [US3] Make shared rendering visibility-aware in `packages/core/src/MapRenderer.ts`
- [x] T012 [P] [US3] Cover hidden and ordered layers in `packages/core/src/MapRenderer.test.ts`
- [x] T013 [US3] Add visibility controls in `apps/editor/src/components/Editor/Inspector/LayerPanel.tsx`

## Phase 6: Integration and validation

- [x] T014 Add the unified editor layer workflow to `apps/editor/cypress/e2e/editor_layout.cy.ts`
- [x] T015 Run targeted editor and core tests and fix regressions
- [x] T016 Run lint and build checks for affected workspaces
- [x] T017 Mark completed tasks and record validation results in `specs/013-map-layers/tasks.md`

## Dependencies

- T002 and T003 precede store and UI integration.
- T004 precedes all editor user stories.
- User Story 1 provides the selectable active layer required by User Stories 2 and 3.
- Renderer visibility can be implemented in parallel with editor organization controls.

## Implementation Strategy

Deliver the independently paintable-layer path first, then organization, then visibility. Keep every transition backed by pure-function tests and finish with the complete browser workflow.

## Validation Results

- Editor layer and painting unit tests: 15 passed.
- Map API tests: 3 passed.
- Core suite: 17 files and 71 tests passed.
- Focused map-layer Cypress workflow: passed.
- Shared types and core builds: passed.
- Editor TypeScript check and focused lint: passed.
- Full editor Jest suite: 17 suites passed; the pre-existing `keyboardTarget.test.ts` environment mismatch remains (`document` unavailable).
- Full editor-layout Cypress suite has unrelated existing layout failures; the new map-layer scenario passes independently.
