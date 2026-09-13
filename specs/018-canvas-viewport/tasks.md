# Tasks: Editor Canvas Viewport

**Input**: Design documents from `/specs/018-canvas-viewport/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/canvas-viewport.md, quickstart.md

**Tests**: Included (constitution TDD). Write failing tests before implementation in each story.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: User story label (`US1`, `US2`, `US3`)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared session camera type used by core and the editor

- [ ] T001 [P] Add `ViewportCamera` (`zoom`, `offsetX`, `offsetY`) in `packages/types/src/viewport.ts`
- [ ] T002 Export `ViewportCamera` from `packages/types/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: One camera mapping, buffer resize, and per-frame transform so every story shares hit-testing and drawing

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 [P] Add failing tests for `screenToWorld`, `worldToTile`, and the 4px secondary click vs pan threshold in `apps/editor/src/lib/canvasCamera.test.ts`
- [ ] T004 Implement `screenToWorld`, `worldToTile`, `PAN_DRAG_THRESHOLD_PX`, and `isPanFromPointerTravel` in `apps/editor/src/lib/canvasCamera.ts`
- [ ] T005 [P] Extend failing cases in `packages/core/src/Renderer.test.ts` for `setSize`, identity `clear` of the full buffer, and ignoring width/height ≤ 0
- [ ] T006 Implement `Renderer.setSize` and identity-space `clear` using the current buffer size in `packages/core/src/Renderer.ts`
- [ ] T007 Add failing tests that `setCamera` / `setCanvasSize` apply on the next frame without reconstructing the engine in `packages/core/src/GameEngine.camera.test.ts`
- [ ] T008 Implement `GameEngine.setCamera` and `setCanvasSize`; each frame identity-clear then `setTransform(zoom, 0, 0, zoom, offsetX, offsetY)` in `packages/core/src/GameEngine.ts` (player default camera = constructor `scale`, offsets 0)
- [ ] T009 Stop recreating the engine when zoom changes; call `setCamera` from `apps/editor/src/hooks/useMapEngine.ts` when `zoom` / `offsetX` / `offsetY` change

**Checkpoint**: Camera math and engine transform are shared; zoom no longer remounts `GameEngine`

---

## Phase 3: User Story 1 - Fill the workspace and zoom the map, not the window (Priority: P1) 🎯 MVP

**Goal**: The map viewing area fills the center workspace. Zoom scales tiles inside that area. Overlay alignment and painting still hit the visible cell.

**Independent Test**: Open a map, confirm the viewing area fills the center, zoom in/out, resize a side panel, paint a visible tile — window size follows the workspace, tiles scale, clicks match cells.

### Tests for User Story 1

> Write these tests FIRST and confirm they FAIL before implementation

- [ ] T010 [P] [US1] Add failing Cypress cases (canvas fills the center; buffer size unchanged after zoom in/out; follows panel resize) in `apps/editor/cypress/e2e/canvas_viewport.cy.ts`

### Implementation for User Story 1

- [ ] T011 [US1] Size `#map-canvas` to the container with `ResizeObserver` and call `setCanvasSize` in `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx` (remove hardcoded `800×600`; keep 1:1 CSS pixels)
- [ ] T012 [US1] Match empty-cell, collision, and entity overlay canvas buffer sizes to the map canvas in `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`
- [ ] T013 [US1] Draw overlays with the same camera transform (`zoom` + offsets) in `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`
- [ ] T014 [US1] Convert pointer coordinates with `screenToWorld` / `worldToTile` in `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx` so paint, entity place/select, and overlays stay aligned
- [ ] T015 [US1] Remove CSS `translate` on map and overlay canvases in `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx` (camera owns pan; required so a full-size canvas does not slide out of the workspace)

**Checkpoint**: Workspace-filling view + zoom-without-grow works; painting still hits the visible tile (pan gestures may still be CSS-broken until US2 if any leftover translate remains — T015 must be done here)

---

## Phase 4: User Story 2 - Keep keyboard and existing pointer pan (Priority: P2)

**Goal**: Arrow keys, middle-button drag, and Space + primary drag move the map under the filled viewing area. Reset zoom keeps pan; `Home` resets both. Arrows do not pan while typing or when a dialog is focused.

**Independent Test**: Zoom until part of the map is off-screen, pan with arrows / middle drag / Space+drag, press `0` then `Home`, type in a name field with arrows.

### Tests for User Story 2

- [ ] T016 [P] [US2] Add failing Cypress cases for arrow pan, middle-button drag, Space+drag (no paint), `0` vs `Home`, and no pan while typing in `apps/editor/cypress/e2e/canvas_viewport.cy.ts`

### Implementation for User Story 2

- [ ] T017 [US2] Drive middle-button and Space+primary pan through `viewportStore.pan` without starting paint/entity actions in `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`; use pointer capture so pan continues if the pointer leaves the view
- [ ] T018 [US2] Keep zoom shortcuts; pan arrows 20px; skip arrows when `isTypingTarget` or a dialog has focus in `apps/editor/src/hooks/useCanvasShortcuts.ts`
- [ ] T019 [US2] Confirm `resetZoom` does not clear offsets and `resetViewport` (`Home`) clears zoom and offsets in `apps/editor/src/stores/viewportStore.ts`
- [ ] T020 [US2] Show grab/grabbing cursor while Space is held in `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`

**Checkpoint**: Existing pan and shortcuts work on the camera, not by moving the canvas element

---

## Phase 5: User Story 3 - Pan with secondary drag and two-finger movement (Priority: P3)

**Goal**: Secondary-button drag and two-finger/`wheel` pan the map. A still secondary click still opens the entity delete menu; empty-cell secondary click does nothing.

**Independent Test**: Secondary-drag pans with no menu; wheel/two-finger pans without zoom; still-click on an entity opens Delete; still-click on empty space has no menu.

### Tests for User Story 3

- [ ] T021 [P] [US3] Add failing unit cases for wheel pan (`-deltaX/-deltaY`, ignore `ctrlKey`) in `apps/editor/src/lib/canvasCamera.test.ts`
- [ ] T022 [P] [US3] Add failing Cypress cases for secondary drag (no menu), secondary click on entity (menu), empty-cell secondary click (no menu), and wheel pan without zoom in `apps/editor/cypress/e2e/canvas_viewport.cy.ts`

### Implementation for User Story 3

- [ ] T023 [US3] Add `wheelPanDelta` (ignore `ctrlKey`) in `apps/editor/src/lib/canvasCamera.ts`
- [ ] T024 [US3] Secondary `pointerdown`/`move`/`up`: pan after 4px travel; suppress `contextmenu` when `didPan`; otherwise open the existing entity menu only if an entity is hit in `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`
- [ ] T025 [US3] Listen to `wheel` with `{ passive: false }` on the viewing area and pan; do not change zoom in `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`
- [ ] T026 [US3] Always prevent the browser context menu on the viewing area in `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`

**Checkpoint**: New pan gestures work; entity delete menu remains on a still secondary click

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Persistence contract, focused tests, quickstart

- [ ] T027 [P] Confirm map save/preview payloads still omit camera fields (no zoom/pan on PUT) while exercising save in `apps/editor/cypress/e2e/canvas_viewport.cy.ts` or an existing map-save spec — do not add viewport fields to API routes
- [ ] T028 Run focused Vitest (`Renderer.test.ts`, `GameEngine.camera.test.ts`), Jest (`canvasCamera.test.ts`), and TypeScript checks for `packages/core` and `apps/editor`
- [ ] T029 Walk `specs/018-canvas-viewport/quickstart.md` and record results at the bottom of this file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately
- **Foundational (Phase 2)**: Depends on T001–T002 — blocks all user stories
- **User Story 1**: Depends on Phase 2 — MVP
- **User Story 2**: Depends on US1 camera-in-canvas (especially T015); rewires existing pan
- **User Story 3**: Depends on US1 camera + US2 pan plumbing in `MapCanvas.tsx`
- **Polish**: After the stories you intend to ship

### User Story Dependencies

- **US1 (P1)**: No dependency on US2/US3
- **US2 (P2)**: Same camera; independently testable once the canvas fills the workspace
- **US3 (P3)**: Extends pointer handling in `MapCanvas.tsx`; independently testable with gesture unit tests even before Cypress

### Within Each User Story

- Tests MUST fail before implementation
- Camera math and engine transform before UI resize
- Overlay size/transform before hit-testing
- Existing pan before new secondary/wheel gestures

### Parallel Opportunities

- T001 in parallel with nothing that edits `index.ts` until T002
- T003 and T005 after T002
- T010 after T009 (Cypress can be written while T011 starts)
- T016 after T015
- T021 and T022 after T017
- T027 during polish beside T028

---

## Parallel Example: User Story 1

```bash
# After Phase 2:
Task: "Cypress fill/zoom/resize in apps/editor/cypress/e2e/canvas_viewport.cy.ts"

# Then sequential in MapCanvas.tsx:
Task: "ResizeObserver → overlay sizes → overlay transform → screenToWorld → remove CSS translate"
```

---

## Parallel Example: User Story 3

```bash
Task: "wheel pan unit tests in apps/editor/src/lib/canvasCamera.test.ts"
Task: "Cypress secondary/wheel cases in apps/editor/cypress/e2e/canvas_viewport.cy.ts"

# After T023:
Task: "secondary drag vs menu → wheel listener → prevent browser context menu"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 `ViewportCamera`
2. Phase 2 camera math + `Renderer`/`GameEngine` + `useMapEngine.setCamera`
3. Phase 3 fill workspace, zoom-inside-view, aligned overlays/paint
4. **STOP**: zoom in — tiles grow, window still fills the center

### Incremental Delivery

1. Setup + Foundational → shared camera
2. US1 → usable zoomed editing (MVP)
3. US2 → restore pan on the new camera
4. US3 → secondary drag + trackpad pan
5. Polish → Cypress + quickstart

### Parallel Team Strategy

1. Complete Phase 1–2 together
2. Dev A: US1 MapCanvas resize/overlays
3. Dev B: US2 shortcuts + viewportStore after T015
4. Dev C: US3 gesture helpers (`canvasCamera.ts`) after T004, then wire MapCanvas after US2

---

## Notes

- Do not persist zoom/pan on maps or in `game.json`
- Do not use `devicePixelRatio` backing stores in this feature
- `apps/player` needs no new files if constructor `scale` becomes the default camera zoom
- Distinguish `resetZoom` (`0`) from `resetViewport` (`Home`)
- Cypress on macOS may lack a local binary; still add the spec

## Validation Results

_(Fill in during T029)_
