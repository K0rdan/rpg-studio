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
