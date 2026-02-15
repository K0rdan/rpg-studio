# Feature: Editor UI Layout & Navigation

## Goal
Implement a modern, professional editor UI layout with hierarchical project navigation, resizable panels, and an intuitive workspace for map editing. This provides the foundation for all editor functionality with a clean, organized interface.

## User Stories

### Core Features
- As a game designer, I want a hierarchical project explorer so that I can easily navigate between maps, entities, and assets.
- As a game designer, I want the tile palette below the canvas so that I have more horizontal space for viewing tiles.
- As a game designer, I want drawing tools on the top toolbar so that I can quickly access them.
- As a game designer, I want an inspector panel on the right so that I can view and edit properties of selected items.
- As a game designer, I want to resize panels so that I can customize my workspace layout.
- As a game designer, I want my panel sizes to persist so that my workspace stays configured how I like it.
- As a game designer, I want keyboard shortcuts for common tools so that I can work efficiently.

### Navigation Features
- As a game designer, I want to organize maps in folders so that I can structure my game world logically.
- As a game designer, I want to organize entities by type (Player, NPCs, Enemies) so that I can find them easily.
- As a game designer, I want to organize assets by type (Tilesets, Charsets, Sounds) so that I can manage resources efficiently.
- As a game designer, I want context menus on items so that I can perform actions like New, Delete, Duplicate, Properties.

### Tileset Features
- As a game designer, I want to filter tiles by tags (grass, stone, water) so that I can find tiles quickly.
- As a game designer, I want to manually tag imported tiles so that I can organize them better.
- As a game designer, I want AI-generated tilesets to have automatic tags so that filtering works immediately.
- As a game designer, I want to view all tiles regardless of tags so that tagging is optional.

## Requirements

### Layout Structure
- **Top Bar**: Menu bar (File, Edit, View, Tools, Help) + Toolbar (drawing tools)
- **Left Panel**: Project Explorer (250px default, 200-400px range)
  - Maps section (hierarchical tree)
  - Entities section (Player, NPCs, Enemies subfolders)
  - Assets section (Tilesets, Charsets, Sounds subfolders)
- **Center Area**: 
  - Canvas viewport (main editing area)
  - Tile Palette below canvas (200px height)
- **Right Panel**: Inspector (300px default, 250-500px range)
  - Contextual properties based on selection
  - Layers management
  - Details section

### Project Explorer
- Hierarchical tree view with expand/collapse
- Icons for different item types (🗺 Maps, 👤 Entities, 🎨 Assets)
- Drag-and-drop for organization (future enhancement)
- Right-click context menus
- Selection highlighting
- Keyboard navigation (arrow keys, Enter to open)

### Toolbar
- **File Operations**: New, Open, Save
- **Edit Operations**: Undo, Redo
- **Drawing Tools**: Brush (B), Fill (F), Eraser (E), Select (S), Entity (V), Region (R)
- Tool-specific options appear below toolbar when tool is selected
- Tooltips with keyboard shortcuts

### Tile Palette
- Tileset selector dropdown
- Filter dropdown (All, Grass, Stone, Water, Tagged Only, Untagged)
- Grid view of tiles (16 columns, scrollable)
- Selected tile highlighted with border
- Multi-tile selection for stamp tool (future)
- Hover tooltip showing tile info
- Search functionality (future)

### Inspector Panel
- **Map Properties** (when map selected):
  - Name, Display Name, Size (width x height)
  - Tileset selector, BGM selector
- **Layers** (when map selected):
  - Checkboxes for Ground, Objects, Collision, Events
  - Layer visibility toggles
- **Details** (when map selected):
  - Cursor position (X, Y)
  - Selected tile ID and name
  - Tile tags (if available)
- **Entity Properties** (when entity selected):
  - Name, Type, Sprite, Position
  - Components (Collision, Interaction, Movement)
  - Events (future)

### Panel Management
- Resize panels by dragging borders
- Collapse/expand panels via header click
- Panel sizes persist to localStorage
- Minimum/maximum width constraints
- Responsive behavior for different screen sizes

### Keyboard Shortcuts
- **Tools**: B (Brush), F (Fill), E (Eraser), S (Select), V (Entity), R (Region)
- **View**: G (Grid), L (Layers), M (Minimap - future)
- **Edit**: Ctrl+Z (Undo), Ctrl+Y (Redo), Ctrl+C/V (Copy/Paste)
- **File**: Ctrl+N (New), Ctrl+O (Open), Ctrl+S (Save)

## Technical Considerations

### State Management
- Use Zustand for editor state (layout, selection, tools)
- Separate stores for map editing, tileset management
- Persist layout preferences to localStorage
- Sync selection state between explorer and canvas

### Component Architecture
- `EditorLayout`: Main layout wrapper
- `TopBar`: Menu bar + Toolbar
- `ProjectExplorer`: Left panel with tree views
- `MapCanvas`: Center canvas with rendering
- `TilePalette`: Bottom panel with tile grid
- `Inspector`: Right panel with contextual properties
- `ResizablePanel`: Reusable panel component

### Tile Tagging System
- Optional `tags` field on `TileDefinition` type
- AI-generated tilesets include automatic tags
- User-imported tilesets work without tags
- Manual tagging via right-click context menu
- Filter logic supports tagged and untagged tiles

### Responsive Design
- Breakpoints: 960px (tablet), 1280px (desktop), 1920px (large)
- Auto-collapse panels on small screens
- Optimize for 1920x1080 and 2560x1440
- Mobile warning (editor requires desktop)

### Integration Points
- Integrate with `@rpg-studio/core` for canvas rendering
- Use existing API endpoints for maps, tilesets, entities
- Extend `Map` type with optional `entities` array
- Extend `Tileset` type with optional `metadata` field

## Implementation Phases

### Phase 1: Core Layout ✅ COMPLETED
- EditorLayout component with 3-panel structure
- ResizablePanel component with drag-to-resize
- TopBar with tool buttons and keyboard shortcuts
- Layout persistence to localStorage
- E2E tests for layout structure

### Phase 2: Project Explorer ✅ COMPLETED
- MapsTree with API integration
- EntitiesTree with Player/NPCs/Interactions subfolders
- AssetsTree with Tilesets/Charsets/Sounds subfolders
- Selection handling and state management
- Empty states and loading indicators
- E2E tests for tree views
- Entities API endpoint implementation

### Phase 3: Map Canvas Integration ✅ COMPLETED
**Goal**: Integrate `@rpg-studio/core` engine to render actual map data with tilesets.

**Components**:
- `useMapEngine` hook - Manages GameEngine lifecycle and data loading
- Updated `MapCanvas` component - Renders maps using core engine
- `CanvasControls` component - Zoom controls UI
- `viewportStore` - Zoom and pan state management
- `useCanvasShortcuts` hook - Keyboard shortcuts for zoom/pan
- Loading and error states for canvas area

**Data Flow**:
1. Fetch project, maps, and tilesets from APIs
2. Initialize GameEngine with canvas element and zoom level
3. Call `engine.init(project, maps, tilesets)`
4. Start continuous render loop (60 FPS)
5. Listen to selection changes and reload map when user selects different map
6. Listen to zoom changes and re-initialize engine with new scale
7. Cleanup engine on unmount

**Technical Details**:
- GameEngine uses requestAnimationFrame for smooth rendering
- AssetLoader handles tileset image loading with retries
- Canvas uses `imageRendering: 'pixelated'` for crisp tiles
- Engine stops cleanly on unmount (no memory leaks)
- Map selection triggers engine reload with new map data
- Zoom levels: 0.25x, 0.5x, 1x, 2x, 4x, 8x
- Pan with middle mouse drag or space + drag
- Keyboard shortcuts: +/- for zoom, arrows for pan, 0 to reset
- `ctx.resetTransform()` prevents cumulative scaling bug

**Files**:
- NEW: `apps/editor/src/hooks/useMapEngine.ts`
- NEW: `apps/editor/src/components/Editor/Canvas/CanvasLoading.tsx`
- NEW: `apps/editor/src/components/Editor/Canvas/CanvasError.tsx`
- NEW: `apps/editor/src/components/Editor/Canvas/CanvasControls.tsx`
- NEW: `apps/editor/src/stores/viewportStore.ts`
- NEW: `apps/editor/src/hooks/useCanvasShortcuts.ts`
- MODIFY: `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`
- MODIFY: `packages/core/src/GameEngine.ts` (added scale parameter)

### Phase 4: Tile Palette 🚧 IN PROGRESS
**Goal**: Implement tileset selector and tile grid for selecting tiles to paint on maps.

**Components**:
- `TilesetSelector` - Dropdown to select active tileset
- `TileGrid` - Scrollable grid displaying all tiles from selected tileset
- `tileSelectionStore` - State management for selected tileset and tile
- Updated `TilePalette` component - Integrates selector and grid

**Features**:
- **Tileset Selector**:
  - MUI Select dropdown showing all project tilesets
  - Displays tileset name and dimensions (tile_width × tile_height)
  - Shows grid size (columns × rows calculated from image)
  - Fetches from `/api/tilesets?projectId={projectId}`
  - Updates selection store on change

- **Tile Grid**:
  - Loads tileset image dynamically
  - Calculates grid dimensions from image size and tile dimensions
  - Renders tiles using CSS Grid with background-position
  - Click to select tile (blue border highlight)
  - Hover shows light border
  - Tooltip displays tile coordinates (x, y)
  - Scrollable for large tilesets
  - Handles different tile sizes (16x16, 32x32, 128x128, etc.)

- **Selection State**:
  - Tracks selected tileset ID
  - Tracks selected tile index and coordinates
  - Ready for drawing tools integration (future)

**Data Flow**:
1. TilePalette fetches tilesets on mount
2. First tileset selected by default
3. TileGrid loads tileset image
4. Calculate grid dimensions (columns, rows)
5. Render tiles with proper background-position
6. User clicks tile → update tileSelectionStore
7. Visual feedback (blue border on selected tile)

**Technical Details**:
- Tile index calculation: `index = y * columns + x`
- Tile coordinates from index: `x = index % columns`, `y = Math.floor(index / columns)`
- CSS background-position: `-${x * tileWidth}px -${y * tileHeight}px`
- Image loading with error handling
- Loading states for tileset image
- Empty state when no tilesets exist

**Files**:
- NEW: `apps/editor/src/stores/tileSelectionStore.ts`
- NEW: `apps/editor/src/components/Editor/TilePalette/TilesetSelector.tsx`
- NEW: `apps/editor/src/components/Editor/TilePalette/TileGrid.tsx`
- MODIFY: `apps/editor/src/components/Editor/TilePalette/TilePalette.tsx`

### Phase 5: Dual-Panel Context Layout 🚧 IN PROGRESS
**Goal**: Restructure layout to use Project Tree + Context Panel side-by-side, maximizing canvas height and creating contextual workflow.

**Layout Structure**:
```
┌──┬─────────────────┬─────────────────┬──────────┬──────────┐
│🖌️│ Project Tree    │ Context Panel   │  Canvas  │Inspector │
│📁│ (scrollable)    │ (Palette/Props) │          │          │
│  │ • Maps          │ ┌───┬───┬───┐   │          │          │
│  │ • Entities      │ │ 0 │ 1 │ 2 │   │          │          │
│  │ • Assets        │ └───┴───┴───┘   │          │          │
└──┴─────────────────┴─────────────────┴──────────┴──────────┘
 56px    200-300px        300-400px       flex      0-300px
```

**Components**:
- `ContextPanel` - Container that renders content based on selection
- `EmptyState` - Shows when nothing selected
- `MapProperties` - Shows map details when map selected
- Updated `TilePalette` - Moves from bottom to context panel
- Updated `EditorLayout` - Adds context panel between tree and canvas

**Context Panel Behavior**:
- **Tileset selected** → Shows Tile Palette with selected tileset
- **Map selected** → Shows Map Properties (name, size, tileset, layers)
- **Entity selected** → Shows Entity Properties (position, sprite, behavior)
- **Nothing selected** → Shows empty state

**Benefits**:
- Canvas uses full height (no bottom palette) - **+450px vertical space**
- Contextual tools appear based on selection
- Tile Palette gets dedicated width (300-400px)
- Better workflow: select item → see tools → use on canvas
- Resizable panels for user customization

**Data Flow**:
1. User clicks tileset in Project Tree
2. `selectionStore` updates: `{ type: 'tileset', id: 'tileset-123' }`
3. `ContextPanel` detects selection change
4. Renders `TilePalette` with selected tileset
5. User selects tile from palette
6. `tileSelectionStore` updates
7. User draws on canvas (future: drawing tools)

**Technical Details**:
- Context Panel renders conditionally based on `selectionStore`
- TilePalette accepts `tilesetId` prop instead of fetching all tilesets
- TilePalette uses flexible height (fills context panel)
- Both panels (tree + context) wrapped in resizable containers
- Canvas no longer has bottom palette - full height available

**Files**:
- NEW: `apps/editor/src/components/Editor/ContextPanel/ContextPanel.tsx`
- NEW: `apps/editor/src/components/Editor/ContextPanel/EmptyState.tsx`
- NEW: `apps/editor/src/components/Editor/ContextPanel/MapProperties.tsx`
- MODIFY: `apps/editor/src/components/Editor/EditorLayout.tsx` (add context panel)
- MODIFY: `apps/editor/src/components/Editor/TilePalette/TilePalette.tsx` (remove fixed height)
- MODIFY: `apps/editor/src/stores/editorStore.ts` (add contextPanelWidth state)

### Phase 6: Drawing Tools (Future)
- Brush tool - Paint selected tile on map
- Fill tool - Flood fill with selected tile
- Eraser tool - Clear tiles
- Select tool - Select region
- Undo/Redo system with command pattern
- Coordinate adjustment for pan offset

### Phase 7: Inspector Panels (Future)
- Map properties editor (name, dimensions, layers)
- Entity properties editor (position, sprite, behavior)
- Tileset properties editor (tags, metadata)
- Layer management UI
- Real-time cursor position display


## Success Criteria

### Layout & Structure
- ✅ **3-Panel Layout Renders**: TopBar, Project Explorer (left), Canvas + Tile Palette (center), Inspector (right)
  - **E2E Test**: `editor_layout.cy.ts` → "Layout Structure" → "should display the 3-panel layout"
  - **Verification**: All panels visible on page load
  
- ✅ **TopBar Displays All Tools**: Brush, Fill, Eraser, Select, Entity, Region buttons visible
  - **E2E Test**: `editor_layout.cy.ts` → "Layout Structure" → "should display the TopBar with tool buttons"
  - **Verification**: 6 tool buttons present and visible

- ✅ **Project Explorer Shows Sections**: Maps, Entities, Assets sections visible
  - **E2E Test**: `editor_layout.cy.ts` → "Layout Structure" → "should display the Project Explorer with tree sections"
  - **Verification**: All 3 sections render with proper labels

- ✅ **Inspector Shows Default State**: "No selection" message displays when nothing selected
  - **E2E Test**: `editor_layout.cy.ts` → "Layout Structure" → "should display the Inspector panel"
  - **Verification**: Inspector panel visible with "No selection" text

- ✅ **Canvas Area Renders**: Canvas element exists for map rendering
  - **E2E Test**: `editor_layout.cy.ts` → "Layout Structure" → "should display the canvas area"
  - **Verification**: `<canvas>` element present in DOM

### Tool Selection & Interaction
- ✅ **Default Tool Selected**: Brush tool highlighted by default
  - **E2E Test**: `editor_layout.cy.ts` → "Tool Selection" → "should highlight Brush tool by default"
  - **Verification**: Brush button has primary color

- ✅ **Tool Switching Works**: Clicking tool buttons changes active tool
  - **E2E Test**: `editor_layout.cy.ts` → "Tool Selection" → "should switch tools when clicking tool buttons"
  - **Verification**: Clicked tool gets primary color, previous tool loses it

- ✅ **Tool Tooltips Display**: Hovering shows tooltip with keyboard shortcut
  - **E2E Test**: `editor_layout.cy.ts` → "Tool Selection" → "should display tooltips on tool hover"
  - **Verification**: Tooltip appears on hover with format "Tool Name (Key)"

### Keyboard Shortcuts
- ✅ **B Key → Brush Tool**: Pressing B activates Brush tool
  - **E2E Test**: `editor_layout.cy.ts` → "Keyboard Shortcuts" → "should switch to Brush tool with B key"
  - **Verification**: Brush tool becomes active after keypress

- ✅ **F Key → Fill Tool**: Pressing F activates Fill tool
  - **E2E Test**: `editor_layout.cy.ts` → "Keyboard Shortcuts" → "should switch to Fill tool with F key"
  - **Verification**: Fill tool becomes active after keypress

- ✅ **E Key → Eraser Tool**: Pressing E activates Eraser tool
  - **E2E Test**: `editor_layout.cy.ts` → "Keyboard Shortcuts" → "should switch to Eraser tool with E key"
  - **Verification**: Eraser tool becomes active after keypress

- ✅ **S Key → Select Tool**: Pressing S activates Select tool
  - **E2E Test**: `editor_layout.cy.ts` → "Keyboard Shortcuts" → "should switch to Select tool with S key"
  - **Verification**: Select tool becomes active after keypress

- ✅ **V Key → Entity Tool**: Pressing V activates Entity tool
  - **E2E Test**: `editor_layout.cy.ts` → "Keyboard Shortcuts" → "should switch to Entity tool with V key"
  - **Verification**: Entity tool becomes active after keypress

- ✅ **R Key → Region Tool**: Pressing R activates Region tool
  - **E2E Test**: `editor_layout.cy.ts` → "Keyboard Shortcuts" → "should switch to Region tool with R key"
  - **Verification**: Region tool becomes active after keypress

### Project Explorer - Maps
- ✅ **Maps Folder Displays**: Maps section visible in tree
  - **E2E Test**: `editor_layout.cy.ts` → "Project Explorer - Maps Tree" → "should display Maps folder"
  - **Verification**: "Maps" text visible in tree

- ✅ **Maps Expand/Collapse**: Clicking Maps toggles expansion
  - **E2E Test**: `editor_layout.cy.ts` → "Project Explorer - Maps Tree" → "should expand/collapse Maps folder"
  - **Verification**: Tree node expands/collapses on click

- ✅ **Maps Loading State**: Shows spinner while fetching
  - **E2E Test**: `editor_layout.cy.ts` → "Project Explorer - Maps Tree" → "should show loading state when fetching maps"
  - **Verification**: "Loading maps..." text appears briefly

- ✅ **Maps Error Handling**: Shows error message on API failure
  - **E2E Test**: `editor_layout.cy.ts` → "Project Explorer - Maps Tree" → "should show error message if maps API fails"
  - **Verification**: "Error:" message displays when API returns 500

### Project Explorer - Entities
- ✅ **Entities Folder with Subfolders**: Player, NPCs, Interactions subfolders visible
  - **E2E Test**: `editor_layout.cy.ts` → "Project Explorer - Entities Tree" → "should display Entities folder with subfolders"
  - **Verification**: All 3 subfolders render when Entities expanded

- ✅ **Entity Empty States**: Shows "No X" when subfolders empty
  - **E2E Test**: `editor_layout.cy.ts` → "Project Explorer - Entities Tree" → "should show empty states for entity subfolders"
  - **Verification**: Empty state text appears in empty subfolders

### Project Explorer - Assets
- ✅ **Assets Folder with Subfolders**: Tilesets, Charsets, Sounds subfolders visible
  - **E2E Test**: `editor_layout.cy.ts` → "Project Explorer - Assets Tree" → "should display Assets folder with subfolders"
  - **Verification**: All 3 subfolders render when Assets expanded

- ✅ **Tilesets Load from API**: Tilesets fetch and display correctly
  - **E2E Test**: `editor_layout.cy.ts` → "Project Explorer - Assets Tree" → "should load tilesets from API"
  - **Verification**: Tilesets appear or empty state shows

### Panel Resizing
- ✅ **Resize Handles Exist**: Elements with `col-resize` cursor present
  - **E2E Test**: `editor_layout.cy.ts` → "Panel Resizing" → "should have resize handles on panel borders"
  - **Verification**: At least one element has `col-resize` cursor

- ✅ **Left Panel Resizes**: Dragging left border changes panel width
  - **E2E Test**: `editor_layout.cy.ts` → "Panel Resizing" → "should resize left panel when dragging"
  - **Verification**: Panel width changes after drag operation

### Layout Persistence
- ✅ **Saves to localStorage**: Panel sizes stored in `rpg-studio-layout` key
  - **E2E Test**: `editor_layout.cy.ts` → "Layout Persistence" → "should persist panel sizes to localStorage"
  - **Verification**: localStorage contains layout data with width properties

- ✅ **Restores on Reload**: Panel sizes restored from localStorage on page load
  - **E2E Test**: `editor_layout.cy.ts` → "Layout Persistence" → "should restore panel sizes on page reload"
  - **Verification**: Panel widths match (±5px) after reload

### Selection Handling
- ✅ **Inspector Updates on Selection**: Selecting tree item updates Inspector
  - **E2E Test**: `editor_layout.cy.ts` → "Selection Handling" → "should update Inspector when selecting a tree item"
  - **Verification**: Inspector content changes when item selected

### Integration Workflows
- ✅ **Complete Workflow**: Navigate → Select Tool → Expand Trees → Switch Tools
  - **E2E Test**: `editor_layout.cy.ts` → "Integration Tests" → "should complete a full workflow"
  - **Verification**: All actions complete without errors

### Performance
- ✅ **Panel Resize Smooth**: Resize operations run at 60 FPS
  - **Manual Test**: Drag panel borders and observe smoothness
  - **Verification**: No visible lag or stuttering during resize

- ✅ **Tree View Renders Fast**: Large projects load without lag
  - **Manual Test**: Load project with 50+ maps
  - **Verification**: Tree renders in < 1 second

- ✅ **Tile Palette Scrolls Smoothly**: Scrolling is smooth and responsive
  - **Manual Test**: Scroll through large tileset
  - **Verification**: 60 FPS scroll performance

- ✅ **Inspector Updates Instantly**: Selection changes reflect immediately
  - **Manual Test**: Click different tree items rapidly
  - **Verification**: Inspector updates in < 100ms

### Post-MVP (Future)
- [ ] Modular panel docking (VS Code style)
- [ ] Save/load workspace layouts
- [ ] Multi-monitor support
- [ ] Drag-and-drop in project explorer
- [ ] Search in project explorer
- [ ] Minimap for canvas

## E2E Test Coverage

**Test File**: `apps/editor/cypress/e2e/editor_layout.cy.ts`

**Test Suites**: 11
- Layout Structure (6 tests)
- Tool Selection (3 tests)
- Keyboard Shortcuts (6 tests)
- Project Explorer - Maps Tree (4 tests)
- Project Explorer - Entities Tree (2 tests)
- Project Explorer - Assets Tree (2 tests)
- Panel Resizing (2 tests)
- Layout Persistence (2 tests)
- Selection Handling (1 test)
- Integration Tests (1 test)

**Total Tests**: 29

**Running Tests**:
```bash
cd apps/editor
npm run cypress:open  # Interactive mode
npm run cypress:run   # Headless mode
```

**Run Specific Test**:
```bash
npx cypress run --spec "cypress/e2e/editor_layout.cy.ts"
```
