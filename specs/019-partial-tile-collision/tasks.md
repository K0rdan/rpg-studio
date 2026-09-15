# Tasks: Partial Tile Collision

**Input**: Design documents from `/specs/019-partial-tile-collision/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included; core features in this repo require unit tests.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Create spec artifacts under `specs/019-partial-tile-collision/` without modifying `specs/016-terrain-collision/`
- [x] T002 Document deferred per-layer `contributesToCollision` in spec assumptions and research

## Phase 2: Foundational

- [x] T003 Add `CollisionRect` and optional `collisionRect` on `TileProperties` in `packages/types/src/tile.ts`
- [x] T004 [P] Persist and validate `collisionRect` in `apps/editor/src/lib/tilesetTiles.ts` and tests
- [x] T005 Extend `packages/core/src/terrainCollision.ts` with solids, actor hitboxes, AABB vs AABB, keep X/Y resolve

## Phase 3: User Story 1 - Tile rectangles (P1)

- [x] T006 [US1] Unit tests for partial rects, full-cell default, stacked solids in `packages/core/src/terrainCollision.test.ts`
- [x] T007 [US1] Palette rectangle editor and store setter in `apps/editor/src/components/Editor/TilePalette/` and `editorStore.ts`

## Phase 4: User Story 2 - Feet hitbox (P1)

- [x] T008 [US2] Default player feet hitbox in `PlayerController.ts` and update `PlayerController.test.ts`

## Phase 5: User Story 3 - Overlay (P1)

- [x] T009 [US3] Overlay returns and draws solids in `collisionOverlay.ts` and `MapCanvas.tsx`

## Phase 6: User Story 4 - Fit opaque (P2)

- [x] T010 [US4] `fitOpaqueCollisionRect` in `packages/core` with tests
- [x] T011 [US4] Fit opaque control in the tile palette using sampled tile pixels

## Phase 7: Polish

- [x] T012 Palette grid shows the current rect on blocking tiles
- [x] T013 Run `packages/core` tests and editor tileset/overlay unit tests

## Deferred (not in this feature)

- Per-layer `contributesToCollision` (Above/Same participation)
- Entity-to-entity collision, directional passage, runtime pixel masks
