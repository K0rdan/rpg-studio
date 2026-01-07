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

## Phase 7: Zoom Controls Enhancement

### Map Editor Zoom (4-6 hours)

- [x] **T012** Create `ZoomControls` component
  - Zoom slider (50-400%)
  - Zoom in/out buttons (+/-)
  - Reset button (⟲)
  - Zoom percentage display
  - Reusable props interface

- [x] **T013** Integrate zoom controls into `MapEditor`
  - Add `mapZoom` state (default: 100)
  - Add `ZoomControls` to toolbar
  - Update canvas size calculation with zoom
  - Update tile rendering with zoom scale
  - Update grid rendering with zoom
  - Update mouse position calculation

- [x] **T014** Implement keyboard shortcuts
  - Add keyboard event listener
  - `+` or `=`: Zoom in
  - `-`: Zoom out
  - `0`: Reset to 100%
  - Focus management for canvas

- [ ] **T015** Test map canvas zoom
  - Test all zoom levels (50%, 100%, 200%, 300%, 400%)
  - Verify pixel-perfect rendering
  - Verify grid alignment
  - Verify tile painting at all zooms

### Tile Palette Zoom (2-3 hours)

- [x] **T016** Add zoom controls to `TilePalette`
  - Add `paletteZoom` state (default: 100)
  - Add `ZoomControls` component
  - Style controls for palette width

- [x] **T017** Update palette rendering
  - Update canvas size with zoom
  - Update tileset image scaling
  - Update selection highlight scaling
  - Update click detection for scaled tiles

- [x] **T018** Test palette zoom
  - Test all zoom levels
  - Verify selection works at all zooms
  - Verify scrolling when zoomed in

### Polish & Documentation (2-3 hours)

- [x] **T019** Add visual polish
  - Smooth transitions
  - Hover/active states
  - Tooltips for all controls

- [x] **T020** Edge case testing
  - Large maps at high zoom
  - Small maps at low zoom
  - Rapid zoom changes
  - Different tileset sizes

- [x] **T021** Update documentation
  - Update spec.md (done)
  - Document keyboard shortcuts
  - Add inline help/tooltips
  - Create user guide (ZOOM_CONTROLS_GUIDE.md)
