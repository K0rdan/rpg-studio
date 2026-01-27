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

## Phase 8: E2E Testing (Drawing Tools)

### Authentication Setup (2 hours)

- [x] **T022** Configure Auth.js Credentials provider for testing
  - Add Credentials provider (development only)
  - Configure JWT session strategy
  - Test password: "test-password"

- [x] **T023** Create Cypress login command
  - Implement `cy.login()` custom command
  - Use `cy.session()` for session caching
  - Handle sign-in flow

### Test Infrastructure (3 hours)

- [x] **T024** Add `data-testid` attributes to components
  - TilePalette: `tile-palette-canvas`
  - MapEditor: `map-editor-canvas`
  - ZoomControls: `zoom-in-button`, `zoom-out-button`, `zoom-reset-button`, `zoom-label`
  - ToolSelector: `tool-button-{tool}`
  - LayerManager: `add-layer-button`, `layer-item-{index}`

- [x] **T025** Create Cypress debugging helpers
  - `cy.waitForCanvas()` - Wait for canvas rendering
  - `cy.debugCanvas()` - Visual debugging with red borders

### Drawing Tools Tests (4-6 hours)

- [x] **T026** Tool Selection tests (4 tests)
  - Display all 5 tools
  - Default selection (Pencil)
  - Click to switch tools
  - Keyboard shortcuts (P, R, F, I, E)

- [x] **T027** Individual tool tests (9 tests)
  - Pencil: Click and drag
  - Rectangle: Preview and fill
  - Fill: Flood fill with confirmation
  - Eyedropper: Sample tiles
  - Eraser: Click and drag

- [x] **T028** Zoom Controls tests (5 tests)
  - Display controls
  - Zoom in/out buttons
  - Reset button
  - Keyboard shortcuts (+, -, 0)

- [x] **T029** Layer Management tests (3 tests)
  - Display layers
  - Add layers
  - Switch layers

- [x] **T030** Integration tests (2 tests)
  - Complete workflow (all tools)
  - Zoom + drawing

### Test Fixes & Isolation (2 hours)

- [x] **T031** Fix test isolation issues
  - Intercept PUT requests to prevent database pollution
  - Handle window.confirm dialogs
  - Increase toast timeouts
  - Fix canvas rendering waits

- [x] **T032** Fix zoom controls test conflicts
  - Add `testIdPrefix` prop to ZoomControls component
  - Separate map zoom (`map-zoom-*`) from palette zoom (`palette-zoom-*`)
  - Update test selectors to use context-specific IDs
  - Improve test cleanup to delete all test projects

**Total E2E Tests**: 23 tests, all passing ✅

### Key Learnings

- **Test Isolation**: Use `cy.intercept()` to prevent API calls from persisting state
- **Canvas Testing**: Custom commands (`waitForCanvas`, `debugCanvas`) essential for canvas apps
- **data-testid**: Stable selectors prevent test brittleness - use context prefixes for reusable components
- **Auth in Tests**: Credentials provider works well for E2E testing in development
- **Cleanup**: Recursive cleanup ensures no test data accumulates across runs
