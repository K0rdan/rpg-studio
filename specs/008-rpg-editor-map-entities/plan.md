# Implementation Plan - Map Entity Placement

## Phase 1: Type Definitions (1-2 hours)

### 1.1 Create Entity Types
- Create `packages/types/src/entity.ts`
- Define `EntityType` enum
- Define `BaseEntity`, `PlayerSpawnEntity`, `NPCEntity`, `InteractionEntity`
- Define `Entity` union type
- Export from `packages/types/src/index.ts`

### 1.2 Update Map Type
- Update `packages/types/src/map.ts`
- Add optional `entities?: Entity[]` field to Map interface

### 1.3 Build Types Package
- Run `npm run build` in `packages/types`
- Verify no TypeScript errors

## Phase 2: Core Engine (3-4 hours)

### 2.1 Create EntityRenderer
- Create `packages/core/src/EntityRenderer.ts`
- Implement entity rendering at tile positions
- Use `SpriteRenderer` for charset animations
- Support different visual representations per entity type
- Handle entity scaling to match tile size

### 2.2 Update Scene
- Modify `packages/core/src/Scene.ts`
- Add `entities` array to Scene state
- Load entities from `Map.entities` array
- Create `EntityRenderer` instances for each entity
- Render entities in correct layer order (after map, before UI)
- Add entity lookup methods (by ID, by position)

### 2.3 Update GameEngine
- Modify `packages/core/src/GameEngine.ts`
- Load sprite assets for all entities during init
- Initialize player position from `player_spawn` entity (if present)
- Create NPC instances with charset animations
- Fallback to current behavior if no player spawn exists

### 2.4 Unit Tests
- Create `packages/core/src/EntityRenderer.test.ts`
- Test entity rendering at correct positions
- Test sprite animation integration
- Test different entity types render correctly

## Phase 3: Editor UI (6-8 hours)

### 3.1 Entity Palette Component
- Create `apps/editor/src/components/EntityPalette.tsx`
- Display available entity types (Player Spawn, NPC, Interaction)
- Allow selecting entity type for placement
- Show sprite preview for entities with sprites
- Support selecting sprite for entity

### 3.2 Entity Properties Panel
- Create `apps/editor/src/components/EntityPropertiesPanel.tsx`
- Edit entity name
- Select sprite for player spawn and NPC entities
- Edit entity-specific properties
- Delete entity button
- Display entity position (read-only or editable)

### 3.3 Update MapEditor
- Modify `apps/editor/src/components/MapEditor.tsx`
- Add "Entity" tool to drawing tools (keyboard shortcut: 'N')
- Handle entity placement on canvas click
- Display entities as visual indicators on map canvas
- Support selecting and editing existing entities
- Handle entity deletion (Delete key when entity selected)
- Render entity icons/sprites on map editor canvas
- Update mouse position calculation for entity placement

### 3.4 Update Map API
- Modify `apps/editor/src/app/api/projects/[projectId]/maps/[mapId]/route.ts`
- Include entities in map JSON serialization
- Validate entity data on save (required fields, valid sprite references)
- Ensure backward compatibility (maps without entities)

## Phase 4: Player Integration (2-3 hours)

### 4.1 Update Player Initialization
- Modify player initialization in `apps/player`
- Load entities from map data
- Position player at `player_spawn` entity location
- Render NPCs with charset animations
- Display interaction points (visual indicator)

## Phase 5: Testing & Verification (4-5 hours)

### 5.1 Unit Tests
- Run core package tests: `cd packages/core && npm run test`
- Verify all existing tests pass
- Verify new EntityRenderer tests pass

### 5.2 E2E Tests
- Create `apps/editor/cypress/e2e/map_entity_placement.cy.ts`
- Test entity tool selection and placement
- Test entity property editing
- Test entity deletion
- Test entity persistence (save/load)
- Test multiple entities on same map
- Run E2E tests: `cd apps/editor && npm run cypress:run`

### 5.3 Manual Testing
- Test entity placement in editor
- Test entity rendering in player
- Test charset animations display correctly
- Validate entity data persistence
- Test with zoom controls
- Test backward compatibility (old maps without entities)

## Phase 6: Documentation (1 hour)

### 6.1 Update Technical Documentation
- Document entity system in `specs/TECHNICAL_DOCUMENTATION.md`
- Add entity placement to user guide
- Document keyboard shortcuts

### 6.2 Update README
- Add feature to `specs/README.md`
- Link to spec folder

## Estimated Total Time: 17-23 hours
