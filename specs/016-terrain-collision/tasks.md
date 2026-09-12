# Tasks: Terrain Collision

**Input**: Design documents from `/specs/016-terrain-collision/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/terrain-collision.md, quickstart.md

**Tests**: Included (constitution TDD). Write failing tests before implementation in each story.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: User story label (`US1`, `US2`, `US3`)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared tileset `tiles` helpers used by API, preview, and editor

- [x] T001 Add failing tests for sparse `tiles` merge, walkable defaults, and invalid ids in `apps/editor/src/lib/tilesetTiles.test.ts`
- [x] T002 Implement `normalizeTilesetTiles` and `setTileCollidable` in `apps/editor/src/lib/tilesetTiles.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core walkability math and tileset read-path so every story shares one blocking result

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Add failing walkability tests (empty/`-1`, missing marks, stacked below, hidden, same, above, out of bounds, occupied-cell list) in `packages/core/src/terrainCollision.test.ts`
- [x] T004 Implement `isCellBlocked`, `blockedCells`, layer participation, and AABB cell occupancy in `packages/core/src/terrainCollision.ts`
- [x] T005 Export terrain collision helpers from `packages/core/src/index.ts`
- [x] T006 [P] Add failing assertions that GET payloads include `tiles` (empty array when absent) in `apps/editor/src/app/api/projects/[projectId]/tilesets/tilesets.test.ts`, `apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/tileset.test.ts`, and `apps/editor/src/app/api/projects/[projectId]/preview/route.test.ts`
- [x] T007 Include merged `tiles` on tileset JSON in `apps/editor/src/app/api/projects/[projectId]/tilesets/route.ts`, `apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/route.ts`, `apps/editor/src/app/api/tilesets/route.ts`, and `apps/editor/src/app/api/projects/[projectId]/preview/route.ts`

**Checkpoint**: `isCellBlocked` matches the spec; tileset reads expose `tiles` without a PATCH yet

---

## Phase 3: User Story 1 - Block walking on solid ground tiles (Priority: P1) 🎯 MVP

**Goal**: Creators can persist blocking marks on tileset tiles; the player cannot enter blocking below cells or leave the map, and can walk on unmarked floor.

**Independent Test**: Mark a wall tile blocking, paint a room on a below layer, save, preview: floor walks, walls and map edges stop the player.

### Tests for User Story 1

> Write these tests FIRST and confirm they FAIL before implementation

- [x] T008 [P] [US1] Add failing PATCH contract tests (auth, 400, 404, Mongo persist, static overlay upsert, sparse storage) in `apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/tileset.test.ts`
- [x] T009 [P] [US1] Add failing movement tests (below block, walkable floor, stacked below OR, map edges, X-then-Y slide, do not freeze if already overlapping a blocked cell) in `packages/core/src/PlayerController.test.ts`

### Implementation for User Story 1

- [x] T010 [US1] Implement `PATCH` on `apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/route.ts` (Mongo `tiles` or project overlay for registry ids such as `ts1`)
- [x] T011 [US1] Resolve X then Y against `terrainCollision` in `packages/core/src/PlayerController.ts`
- [x] T012 [US1] Pass the current map and tileset into player updates from `packages/core/src/GameEngine.ts` (skip collision when `enablePlayerControls` is false)
- [x] T013 [US1] Add a Blocking control for the selected palette tile in `apps/editor/src/components/Editor/TilePalette/TilePalette.tsx` and keep local `tiles` on the loaded tileset
- [x] T014 [US1] Add tileset dirty state in `apps/editor/src/stores/editorStore.ts` and persist `PATCH` then map save from `apps/editor/src/components/Editor/ToolBar/ToolBar.tsx`

**Checkpoint**: Saved blocking below tiles stop the player in preview/play; unmarked tilesets stay walkable inside the map

---

## Phase 4: User Story 2 - Keep scenery walkable (Priority: P2)

**Goal**: Same-depth and above scenery never block, even when painted with a blocking tileset tile; a below blocker under the same cell still stops the player.

**Independent Test**: Paint the blocking tile only on same/above — walk through. Paint it on below plus decoration on same/above — still blocked. Overlap rules stay unchanged.

### Tests for User Story 2

- [x] T015 [P] [US2] Add failing cases that same-only, above-only, and hidden-below tiles never block, and that a below blocker still wins when decoration stacks, in `packages/core/src/terrainCollision.test.ts`
- [x] T016 [P] [US2] Add a failing PlayerController case walking through same/above-only blocking tiles in `packages/core/src/PlayerController.test.ts`

### Implementation for User Story 2

- [x] T017 [US2] Keep participation limited to visible below layers in `packages/core/src/terrainCollision.ts` (no render-priority coupling beyond that)
- [x] T018 [US2] Confirm `packages/core/src/MapRenderer.ts` and `packages/core/src/GameEngine.ts` still compose overlap independently of collision

**Checkpoint**: Visual priority and movement blocking stay independent

---

## Phase 5: User Story 3 - Inspect and edit collision in the editor (Priority: P3)

**Goal**: Palette shows which tiles block; a map overlay highlights cells that currently stop movement and updates when tiles, visibility, or priority change.

**Independent Test**: Toggle a tile, see the palette badge, enable overlay, paint/erase/hide a below layer or change priority, and watch highlights match runtime blocking.

### Tests for User Story 3

- [x] T019 [P] [US3] Add failing overlay derivation tests (only current blocking cells; hidden/same/above ignored; updates after paint and priority) in `apps/editor/src/lib/collisionOverlay.test.ts`
- [x] T020 [P] [US3] Extend `apps/editor/cypress/e2e/editor_layout.cy.ts` with overlay toggle and blocking-cell count assertions

### Implementation for User Story 3

- [x] T021 [US3] Implement overlay cell list using `@packages/core` `blockedCells` in `apps/editor/src/lib/collisionOverlay.ts`
- [x] T022 [US3] Add collision overlay session flag in `apps/editor/src/stores/editorStore.ts`
- [x] T023 [US3] Draw the overlay on `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx` (testid `collision-overlay`)
- [x] T024 [US3] Add an overlay toggle on `apps/editor/src/components/Editor/ToolBar/ToolBar.tsx`
- [x] T025 [US3] Show blocking badges on palette cells in `apps/editor/src/components/Editor/TilePalette/TileGrid.tsx`
- [x] T026 [US3] Recompute overlay when map layers, visibility, priority, or tileset `tiles` change in `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`

**Checkpoint**: Overlay matches `blockedCells`; palette marks are visible without opening preview

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Compatibility, shared payloads, and quickstart validation

- [x] T027 [P] Keep POST/save-generated tilesets initializing `tiles` as omitted or `[]` in `apps/editor/src/app/api/projects/[projectId]/tilesets/route.ts` and `apps/editor/src/app/api/projects/[projectId]/tilesets/save-generated/route.ts`
- [x] T028 [P] Merge overlay `tiles` onto registry tilesets in preview and `GET /api/tilesets` so `ts1` marks apply in `apps/editor/src/app/api/projects/[projectId]/preview/route.ts` and `apps/editor/src/app/api/tilesets/route.ts`
- [x] T029 Run focused Vitest (`packages/core`), Jest (tileset + preview routes, editor helpers), and affected TypeScript builds
- [ ] T030 Walk `specs/016-terrain-collision/quickstart.md` and record results at the bottom of this file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately
- **Foundational (Phase 2)**: Depends on T001–T002 — blocks all user stories
- **User Story 1**: Depends on Phase 2 — MVP
- **User Story 2**: Depends on Phase 2; safest after US1 movement wiring (T011–T012)
- **User Story 3**: Depends on Phase 2 `blockedCells`; overlay can start after T004 even before US1 UI, but badges need T013
- **Polish**: After the stories you intend to ship

### User Story Dependencies

- **US1 (P1)**: No dependency on US2/US3
- **US2 (P2)**: Uses the same `terrainCollision` rules as US1; independently testable with same/above fixtures
- **US3 (P3)**: Uses `blockedCells`; does not require preview to prove overlay correctness

### Within Each User Story

- Tests MUST fail before implementation
- Persistence before relying on preview
- Core movement before editor Save wiring
- Overlay derivation before canvas/toolbar UI

### Parallel Opportunities

- T003 and T006 after T002
- T008 and T009 after Phase 2
- T015 and T016 after T012
- T019 and T020 after T004
- T027 and T028 during polish

---

## Parallel Example: User Story 1

```bash
# After Phase 2:
Task: "PATCH contract tests in apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/tileset.test.ts"
Task: "PlayerController movement tests in packages/core/src/PlayerController.test.ts"

# Then sequential:
Task: "PATCH route → PlayerController → GameEngine → palette Blocking → Save dirty/PATCH"
```

---

## Parallel Example: User Story 3

```bash
Task: "collisionOverlay.test.ts"
Task: "editor_layout.cy.ts overlay assertions"

# After T021:
Task: "editorStore flag, MapCanvas overlay, ToolBar toggle, TileGrid badges"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 helpers
2. Phase 2 walkability + tileset GET `tiles`
3. Phase 3 PATCH, movement, palette Blocking, Save
4. **STOP**: paint a below room, preview, confirm walls and edges block

### Incremental Delivery

1. Setup + Foundational → shared `isCellBlocked`
2. US1 → playable terrain collision (MVP)
3. US2 → confirm scenery does not trap the player
4. US3 → overlay and badges for authoring
5. Polish → static tileset overlay + quickstart

### Parallel Team Strategy

1. Complete Phase 1–2 together
2. Dev A: US1 PATCH + palette/save
3. Dev B: US1 PlayerController + GameEngine (after T004)
4. Dev C: US3 overlay (after T004), then US2 tests

---

## Notes

- Empty map tile index remains `-1` and is never collidable
- Do not infer collision from `same`/`above`
- Registry tilesets persist via project overlay, not `config/tilesets.ts`
- `apps/player` needs no feature-specific files if `GameEngine` consumes `tileset.tiles`

## Validation Results

- Core: 19 files and 130 tests passed; core TypeScript build passed.
- Editor: production build and TypeScript check passed.
- Focused editor helpers/API: 6 suites and 60 tests passed during implementation.
- Focused ESLint: no errors; one pre-existing `useMapEngine` dependency warning remains.
- Cypress scenario was added, but local execution remains unavailable because the Cypress 16 macOS binary is absent; `npx cypress install` did not populate the sandbox cache.
- T030 remains open pending the browser quickstart.
