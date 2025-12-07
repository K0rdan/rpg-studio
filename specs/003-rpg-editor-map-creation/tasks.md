# Tasks: Map Creation

**Branch**: `003-rpg-editor-map-creation` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Phase 1: Backend & Types

- [x] T001 Check and update `Map` interface in `@packages/types` to include `tilesetId`.
- [x] T002 Create API route `GET /api/tilesets` to serve available tilesets (mock or from DB).

## Phase 2: Editor UI - Properties

- [x] T003 Create `MapProperties` component (Width, Height, Tileset Select).
- [x] T004 Implement resize logic in `MapEditor` (update `layers.data` when W/H changes).

## Phase 3: Tile Palette

- [x] T005 Update `TilePalette` to accept `tilesetImage` and render it.
- [x] T006 Implement tile selection logic (grid click -> tile index).

## Phase 4: Layer Management

- [x] T007 Add Layer Selector UI to `MapEditor`.
- [x] T008 Update `MapEditor` state to track `activeLayerIndex`.

## Phase 5: Canvas & Interaction

- [x] T009 Update `MapEditor` canvas rendering to draw all layers using the tileset.
- [x] T010 Update painting logic to modify `activeLayerIndex`.

## Phase 6: Integration

- [x] T011 Verify saving functionality with new map data structure.
