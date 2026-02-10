# Tasks: Map Entity Placement

**Branch**: `008-rpg-editor-map-entities` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Phase 1: Type Definitions

- [ ] **T001** Create `packages/types/src/entity.ts`
  - Define `EntityType` enum (PlayerSpawn, NPC, Interaction)
  - Define `BaseEntity` interface
  - Define `PlayerSpawnEntity` interface
  - Define `NPCEntity` interface
  - Define `InteractionEntity` interface
  - Define `Entity` union type

- [ ] **T002** Update `packages/types/src/map.ts`
  - Add optional `entities?: Entity[]` field to Map interface

- [ ] **T003** Update `packages/types/src/index.ts`
  - Export entity types

- [ ] **T004** Build types package
  - Run `npm run build` in `packages/types`
  - Verify no TypeScript errors

## Phase 2: Core Engine

- [ ] **T005** Create `packages/core/src/EntityRenderer.ts`
  - Implement constructor (entity, sprite, spriteRenderer)
  - Implement render method (render at tile position)
  - Support entity scaling to match tile size
  - Handle different entity type visuals

- [ ] **T006** Update `packages/core/src/Scene.ts`
  - Add entities array to Scene state
  - Implement loadEntities method
  - Create EntityRenderer instances for each entity
  - Update render method to render entities
  - Add entity lookup methods (getEntityById, getEntitiesAtPosition)

- [ ] **T007** Update `packages/core/src/GameEngine.ts`
  - Load sprite assets for entities during init
  - Initialize player position from player_spawn entity
  - Create NPC instances with charset animations
  - Fallback to current behavior if no player spawn

- [ ] **T008** Create `packages/core/src/EntityRenderer.test.ts`
  - Test entity rendering at correct positions
  - Test sprite animation integration
  - Test different entity types

- [ ] **T009** Run core package tests
  - Verify all tests pass

## Phase 3: Editor UI

- [ ] **T010** Create `apps/editor/src/components/EntityPalette.tsx`
  - Display entity type buttons (Player Spawn, NPC, Interaction)
  - Handle entity type selection
  - Show sprite preview for selected entity
  - Sprite selector for Player Spawn and NPC

- [ ] **T011** Create `apps/editor/src/components/EntityPropertiesPanel.tsx`
  - Display selected entity properties
  - Edit entity name
  - Select sprite for Player Spawn/NPC
  - Display entity position
  - Delete entity button

- [ ] **T012** Update `apps/editor/src/components/MapEditor.tsx` - Add Entity Tool
  - Add "Entity" tool to drawing tools
  - Add keyboard shortcut 'N' for entity tool
  - Handle entity tool selection

- [ ] **T013** Update `apps/editor/src/components/MapEditor.tsx` - Entity Placement
  - Handle entity placement on canvas click
  - Generate unique entity IDs
  - Add entity to map data
  - Update canvas to show placed entity

- [ ] **T014** Update `apps/editor/src/components/MapEditor.tsx` - Entity Rendering
  - Render entity icons/sprites on map canvas
  - Show visual indicators for entities
  - Handle entity rendering with zoom

- [ ] **T015** Update `apps/editor/src/components/MapEditor.tsx` - Entity Selection
  - Handle entity selection on click
  - Highlight selected entity
  - Show EntityPropertiesPanel for selected entity

- [ ] **T016** Update `apps/editor/src/components/MapEditor.tsx` - Entity Deletion
  - Handle Delete key when entity selected
  - Remove entity from map data
  - Update canvas

- [ ] **T017** Update Map API routes
  - Include entities in map JSON serialization
  - Validate entity data on save
  - Ensure backward compatibility

- [ ] **T018** Add `data-testid` attributes
  - Entity palette: `entity-palette`, `entity-type-{type}`
  - Entity properties: `entity-properties-panel`, `entity-name-input`, etc.
  - Entity tool button: `tool-button-entity`

## Phase 4: Player Integration

- [ ] **T019** Update player initialization
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
  - Test multiple entities on same map

- [ ] **T021** Run E2E tests
  - Execute `npm run cypress:run` in apps/editor
  - Verify all tests pass

- [ ] **T022** Manual testing - Editor
  - Place player spawn entity
  - Place NPC entities with different sprites
  - Place interaction entities
  - Edit entity properties
  - Delete entities
  - Save and reload map
  - Test with zoom controls

- [ ] **T023** Manual testing - Player
  - Verify player spawns at player_spawn location
  - Verify NPCs display with charset animations
  - Verify NPC animations cycle correctly
  - Test with maps without entities (backward compatibility)

## Phase 6: Documentation

- [ ] **T024** Update technical documentation
  - Document entity system
  - Add entity placement guide
  - Document keyboard shortcuts

- [ ] **T025** Update specs README
  - Add feature 008 to README.md
  - Link to spec folder

**Total Tasks**: 25
