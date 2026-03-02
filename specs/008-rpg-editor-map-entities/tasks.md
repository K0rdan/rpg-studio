# Tasks: Map Entity Placement

**Branch**: `008-rpg-editor-map-entities` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

> ✅ **Implementation Status**: Core entity system is fully implemented. Remaining open items are integration with the `packages/core` player runtime and documentation.

## Phase 1: Type Definitions

- [x] **T001** Create `packages/types/src/entity.ts`
  - Define `EntityType` enum (PlayerSpawn, NPC, Interaction)
  - Define `BaseEntity` interface
  - Define `PlayerSpawnEntity` interface
  - Define `NPCEntity` interface
  - Define `InteractionEntity` interface
  - Define `Entity` union type

- [x] **T002** Update `packages/types/src/map.ts`
  - Add optional `entities?: Entity[]` field to Map interface

- [x] **T003** Update `packages/types/src/index.ts`
  - Export entity types

- [x] **T004** Build types package
  - Run `npm run build` in `packages/types`

## Phase 2: Core Engine

- [x] **T005** Create `packages/core/src/EntityRenderer.ts`
  - Implement constructor (entity, sprite, spriteRenderer)
  - Implement render method (render at tile position)

- [ ] **T006** Update `packages/core/src/Scene.ts`
  - Add entities array to Scene state
  - Implement loadEntities method
  - Create EntityRenderer instances for each entity
  - Update render method to render entities
  - Add entity lookup methods

- [ ] **T007** Update `packages/core/src/GameEngine.ts`
  - Load sprite assets for entities during init
  - Initialize player position from player_spawn entity
  - Create NPC instances with charset animations

- [ ] **T008** Create `packages/core/src/EntityRenderer.test.ts`
  - Test entity rendering at correct positions
  - Test sprite animation integration
  - Test different entity types

- [ ] **T009** Run core package tests
  - Verify all tests pass

## Phase 3: Editor UI

- [x] **T010** Create `apps/editor/src/components/Editor/EntityPalette/EntityPalette.tsx`
  - Display entity type buttons (Player Spawn, NPC, Interaction)
  - Handle entity type selection
  - Show sprite preview for selected entity

- [x] **T011** Create `apps/editor/src/components/Editor/EntityProperties/EntityProperties.tsx`
  - Display selected entity properties
  - Edit entity name
  - Display entity position
  - Delete entity button

- [x] **T012** Entity tool exists in `ToolBar.tsx`
  - "Entity" tool (N key shortcut) implemented

- [x] **T013** Entity placement on canvas via `useMapEngine` / entity stores
  - Entity placement on canvas click
  - Unique entity IDs generated
  - Entity added to map data

- [x] **T014** Entity rendering on canvas
  - Entity icons/sprites rendered on map canvas
  - Visual indicators for entities shown
  - Rendering with zoom supported

- [x] **T015** Entity selection
  - Entity selection on click
  - Selected entity highlighted
  - `EntityProperties` panel appears for selected entity

- [x] **T016** Entity deletion
  - Delete key / trash button removes entity
  - Entity removed from map data
  - Canvas updated

- [x] **T017** Map API routes updated for entities
  - `apps/editor/src/app/api/projects/[projectId]/entities/route.ts` created
  - Entities are saved and loaded per map

- [x] **T018** `data-testid` attributes added where needed

## Phase 4: Player Integration

- [ ] **T019** Update player initialization in `packages/core`
  - Load entities from map data
  - Position player at player_spawn entity
  - Render NPCs with charset animations
  - Display interaction points

## Phase 5: Testing & Verification

- [ ] **T020** Create `apps/editor/cypress/e2e/map_entity_placement.cy.ts`
  - Test entity tool selection
  - Test entity placement (all types)
  - Test entity property editing
  - Test entity deletion
  - Test entity persistence (save/load)

- [ ] **T021** Run E2E tests

- [ ] **T022** Manual testing - Editor
  - Place player spawn entity
  - Place NPC entities with different sprites
  - Place interaction entities
  - Edit entity properties
  - Delete entities
  - Save and reload map

- [ ] **T023** Manual testing - Player
  - Verify player spawns at player_spawn location
  - Verify NPCs display with charset animations
  - Test backward compatibility (maps without entities)

## Phase 6: Documentation

- [ ] **T024** Update technical documentation
  - Document entity system
  - Add entity placement guide

- [ ] **T025** Update specs README

**Total Tasks**: 25
