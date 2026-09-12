# Tasks: Layer Focus Aids

## Phase 1: Setup

- [x] T001 Create feature specification and design artifacts in `specs/014-layer-focus/`

## Phase 2: Foundational

- [x] T002 [P] Add pure focus/isolate presentation helpers and tests in `apps/editor/src/lib/layerFocus.ts` and `apps/editor/src/lib/layerFocus.test.ts`
- [x] T003 Add `isolateLayers` session state in `apps/editor/src/stores/editorStore.ts`

## Phase 3: User Story 1 - Focus the selected layer

**Independent Test**: Select among two overlapping visible layers and confirm only the active one stays full strength; preview stays undimmed.

- [x] T004 [US1] Accept optional map view options in `packages/core/src/MapRenderer.ts`
- [x] T005 [P] [US1] Cover subdued vs full-strength draws in `packages/core/src/MapRenderer.test.ts`
- [x] T006 [US1] Pass editor focus options from `apps/editor/src/hooks/useMapEngine.ts` without affecting preview construction
- [x] T007 [US1] Reflect the focused layer in `apps/editor/src/components/Editor/Inspector/LayerPanel.tsx`

## Phase 4: User Story 2 - Isolate a layer

**Independent Test**: Isolate, switch layer, exit isolate; persisted visibility is unchanged.

- [x] T008 [US2] Apply isolate in `packages/core/src/MapRenderer.ts` and tests in `packages/core/src/MapRenderer.test.ts`
- [x] T009 [US2] Toggle isolate from the visibility control (Alt-click + tooltip) in `apps/editor/src/components/Editor/Inspector/LayerPanel.tsx`
- [x] T010 [US2] Clear isolate when the current map changes in `apps/editor/src/hooks/useMapEngine.ts`

## Phase 5: User Story 3 - Empty-cell markers

**Independent Test**: A ground tile under an empty overlay cell still shows a marker; painting the overlay removes it.

- [x] T011 [US3] Derive empty cells of the active layer in `apps/editor/src/lib/layerFocus.ts`
- [x] T012 [US3] Draw markers on the editor overlay in `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`

## Phase 6: Polish

- [x] T013 Add a unified-editor Cypress flow in `apps/editor/cypress/e2e/editor_layout.cy.ts`
- [x] T014 Run targeted tests, lint, and type-check; record results in `specs/014-layer-focus/tasks.md`

## Validation (T014)

- `npm run test --workspace @packages/core -- src/MapRenderer.test.ts` — 8 passed
- `npm run test --workspace @apps/editor -- --runInBand src/lib/layerFocus.test.ts` — 9 passed
- `npx tsc --noEmit -p packages/core/tsconfig.json` and `npx tsc --noEmit -p apps/editor/tsconfig.json` — passed
- Editor `eslint` still reports existing repo errors; no new errors in the 014 source files
- Cypress flow added in `editor_layout.cy.ts` (not executed in this pass)

## Dependencies

- T002/T003 before UI and engine wiring.
- User Story 1 provides the view-options channel used by isolate.
- Empty-cell overlay can proceed once `activeLayer` and map data are available; it does not depend on dimming visually.

## Implementation Strategy

Ship focus dimming first (the default composition aid), then isolate, then empty-cell markers. Keep every presentation path defaulting to current full-strength rendering when options are omitted.
