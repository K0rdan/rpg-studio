# Tasks: Editor UI Layout

## Phase 1: Core Layout (Weeks 1-2)

### Week 1: Layout Foundation

#### Task 1.1: EditorLayout Component
**Estimated Time**: 8 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Create the main editor layout component with 3-panel structure.

**Files to Create**:
- `apps/editor/src/components/Editor/EditorLayout.tsx`

**Implementation Steps**:
1. Create `EditorLayout` component with Box layout
2. Add TopBar at the top
3. Add 3-column flex layout (left panel, center, right panel)
4. Import and place ProjectExplorer, Canvas, TilePalette, Inspector
5. Add responsive styles for different screen sizes

**Acceptance Criteria**:
- [ ] Layout renders with 3 panels
- [ ] TopBar displays at the top
- [ ] Canvas and TilePalette are in center column
- [ ] Layout is responsive

---

#### Task 1.2: ResizablePanel Component
**Estimated Time**: 6 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Create reusable resizable panel component with drag-to-resize.

**Files to Create**:
- `apps/editor/src/components/shared/ResizablePanel.tsx`

**Implementation Steps**:
1. Create ResizablePanel component accepting props (id, defaultWidth, minWidth, maxWidth, position)
2. Add state for current width and isResizing
3. Implement mouseDown/mouseMove/mouseUp handlers for resize
4. Add resize handle with hover effect
5. Enforce min/max width constraints

**Acceptance Criteria**:
- [ ] Panel can be resized by dragging border
- [ ] Min/max width constraints are enforced
- [ ] Resize handle shows on hover
- [ ] Smooth resize experience (60 FPS)

---

#### Task 1.3: Editor Store
**Estimated Time**: 4 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Create Zustand store for editor state management.

**Files to Create**:
- `apps/editor/src/stores/editorStore.ts`

**Implementation Steps**:
1. Install zustand: `npm install zustand`
2. Create editorStore with layout state (panel sizes, open/closed)
3. Add actions: toggleLeftSidebar, toggleRightSidebar, setLeftSidebarWidth, setRightSidebarWidth
4. Add tool state (activeTool, brushSize, opacity)
5. Add actions: setActiveTool, setBrushSize, setOpacity

**Acceptance Criteria**:
- [ ] Store exports useEditorStore hook
- [ ] Layout state can be read and updated
- [ ] Tool state can be read and updated
- [ ] Store works with React components

---

#### Task 1.4: Layout Persistence
**Estimated Time**: 3 hours  
**Priority**: Medium  
**Status**: ⏳ Not Started

**Description**: Persist layout preferences to localStorage.

**Files to Create**:
- `apps/editor/src/hooks/useLayoutPersistence.ts`

**Implementation Steps**:
1. Create useLayoutPersistence hook
2. Load layout from localStorage on mount
3. Save layout to localStorage on change (debounced)
4. Handle missing/invalid localStorage data
5. Integrate with EditorLayout component

**Acceptance Criteria**:
- [ ] Panel sizes persist after page refresh
- [ ] Invalid data doesn't break the app
- [ ] Saves are debounced (not on every pixel change)

---

#### Task 1.5: TopBar Components
**Estimated Time**: 4 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Create menu bar and toolbar components.

**Files to Create**:
- `apps/editor/src/components/Editor/TopBar/TopBar.tsx`
- `apps/editor/src/components/Editor/TopBar/MenuBar.tsx`
- `apps/editor/src/components/Editor/TopBar/Toolbar.tsx`

**Implementation Steps**:
1. Create MenuBar with MUI AppBar and Menu components
2. Add menu items: File, Edit, View, Tools, Help
3. Create Toolbar with IconButton components
4. Add tool buttons: Brush, Fill, Eraser, Select, Entity, Region
5. Add tooltips with keyboard shortcuts

**Acceptance Criteria**:
- [ ] MenuBar displays with all menu items
- [ ] Toolbar displays with all tool buttons
- [ ] Tooltips show on hover
- [ ] Clicking tool button updates active tool

---

### Week 2: Project Explorer

#### Task 2.1: ProjectExplorer Base
**Estimated Time**: 4 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Create base ProjectExplorer component.

**Files to Create**:
- `apps/editor/src/components/Editor/ProjectExplorer/ProjectExplorer.tsx`

**Implementation Steps**:
1. Create ProjectExplorer component with Box layout
2. Add header with "PROJECT EXPLORER" title
3. Add sections for Maps, Entities, Assets
4. Add "+ New" button at bottom
5. Style with proper spacing and colors

**Acceptance Criteria**:
- [ ] ProjectExplorer renders in left panel
- [ ] Header displays correctly
- [ ] Sections are visible
- [ ] "+ New" button is at bottom

---

#### Task 2.2: MapsTree Component
**Estimated Time**: 5 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Create hierarchical tree view for maps.

**Files to Create**:
- `apps/editor/src/components/Editor/ProjectExplorer/MapsTree.tsx`

**Implementation Steps**:
1. Install MUI TreeView: `npm install @mui/x-tree-view`
2. Create MapsTree component using TreeView
3. Fetch maps from API
4. Render maps as TreeItem components
5. Add map icon (🗺) to each item
6. Handle selection (update selection store)

**Acceptance Criteria**:
- [ ] Maps display in tree view
- [ ] Maps can be expanded/collapsed
- [ ] Clicking map updates selection
- [ ] Map icon displays correctly

---

#### Task 2.3: EntitiesTree Component
**Estimated Time**: 5 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Create hierarchical tree view for entities with subfolders.

**Files to Create**:
- `apps/editor/src/components/Editor/ProjectExplorer/EntitiesTree.tsx`

**Implementation Steps**:
1. Create EntitiesTree component using TreeView
2. Add subfolders: Player, NPCs, Enemies
3. Fetch entities from API
4. Group entities by type
5. Add entity icon (👤) to each item
6. Handle selection

**Acceptance Criteria**:
- [ ] Entities display in tree view with subfolders
- [ ] Player, NPCs, Enemies subfolders exist
- [ ] Entities are grouped correctly
- [ ] Clicking entity updates selection

---

#### Task 2.4: AssetsTree Component
**Estimated Time**: 5 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Create hierarchical tree view for assets with subfolders.

**Files to Create**:
- `apps/editor/src/components/Editor/ProjectExplorer/AssetsTree.tsx`

**Implementation Steps**:
1. Create AssetsTree component using TreeView
2. Add subfolders: Tilesets, Charsets, Sounds
3. Fetch assets from API
4. Group assets by type
5. Add asset icons (🖼, 🚶, 🔊) to each item
6. Handle selection

**Acceptance Criteria**:
- [ ] Assets display in tree view with subfolders
- [ ] Tilesets, Charsets, Sounds subfolders exist
- [ ] Assets are grouped correctly
- [ ] Clicking asset updates selection

---

#### Task 2.5: Context Menus
**Estimated Time**: 6 hours  
**Priority**: Medium  
**Status**: ⏳ Not Started

**Description**: Add right-click context menus to tree items.

**Files to Create**:
- `apps/editor/src/components/shared/ContextMenu.tsx`
- `apps/editor/src/components/Editor/ProjectExplorer/MapContextMenu.tsx`

**Implementation Steps**:
1. Create reusable ContextMenu component using MUI Menu
2. Create MapContextMenu with actions: New Map, Duplicate, Delete, Properties
3. Add right-click handler to MapsTree
4. Implement action handlers (call API endpoints)
5. Add confirmation dialogs for destructive actions

**Acceptance Criteria**:
- [ ] Right-clicking map shows context menu
- [ ] All menu items work correctly
- [ ] Delete shows confirmation dialog
- [ ] Context menu closes after action

---

## Phase 2: Map Editor Integration (Weeks 3-5)

### Week 3: Canvas Integration

#### Task 3.1: MapCanvas Component
**Estimated Time**: 10 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Create canvas component with rendering integration.

**Files to Create**:
- `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`
- `apps/editor/src/stores/mapStore.ts`
- `apps/editor/src/hooks/useCanvasRenderer.ts`

**Implementation Steps**:
1. Create MapCanvas component with HTML5 canvas element
2. Create mapStore with Zustand (activeMap, layers, cursorPosition)
3. Create useCanvasRenderer hook
4. Integrate @rpg-studio/core MapRenderer
5. Set up render loop with requestAnimationFrame
6. Handle canvas resize
7. Add grid overlay toggle

**Acceptance Criteria**:
- [ ] Canvas renders map from @rpg-studio/core
- [ ] Map updates when activeMap changes
- [ ] Grid overlay can be toggled
- [ ] Canvas resizes with window

---

#### Task 3.2: Canvas Mouse Events
**Estimated Time**: 6 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Handle mouse events on canvas for tool interactions.

**Files to Modify**:
- `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`

**Implementation Steps**:
1. Add onClick handler to canvas
2. Add onMouseMove handler
3. Add onMouseDown/onMouseUp handlers
4. Convert pixel coordinates to tile coordinates
5. Update cursor position in mapStore
6. Call active tool's handler methods

**Acceptance Criteria**:
- [ ] Clicking canvas converts to tile coordinates
- [ ] Cursor position updates in store
- [ ] Mouse events trigger tool actions
- [ ] Coordinates are accurate with zoom

---

#### Task 3.3: Canvas Controls
**Estimated Time**: 4 hours  
**Priority**: Medium  
**Status**: ⏳ Not Started

**Description**: Add zoom and pan controls to canvas.

**Files to Create**:
- `apps/editor/src/components/Editor/Canvas/CanvasControls.tsx`

**Implementation Steps**:
1. Create CanvasControls component with zoom buttons
2. Add zoom state to mapStore (10% - 400%)
3. Implement zoom in/out actions
4. Add pan functionality (space + drag or middle mouse)
5. Add zoom to cursor position

**Acceptance Criteria**:
- [ ] Zoom buttons work correctly
- [ ] Zoom range is 10% - 400%
- [ ] Pan with space + drag works
- [ ] Zoom centers on cursor position

---

### Week 4: Drawing Tools

#### Task 4.1: Tool Classes
**Estimated Time**: 10 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Implement drawing tool classes.

**Files to Create**:
- `apps/editor/src/lib/tools/brushTool.ts`
- `apps/editor/src/lib/tools/fillTool.ts`
- `apps/editor/src/lib/tools/eraserTool.ts`
- `apps/editor/src/lib/tools/selectTool.ts`

**Implementation Steps**:
1. Create BrushTool class with onMouseDown, onMouseMove methods
2. Implement tile painting logic (update mapStore)
3. Create FillTool class with flood fill algorithm
4. Create EraserTool class (paint with tile ID 0)
5. Create SelectTool class for area selection
6. Add tool interface for consistency

**Acceptance Criteria**:
- [ ] BrushTool paints tiles on click
- [ ] FillTool fills connected area
- [ ] EraserTool removes tiles
- [ ] SelectTool selects rectangular area
- [ ] All tools update mapStore correctly

---

#### Task 4.2: Keyboard Shortcuts
**Estimated Time**: 6 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Implement keyboard shortcuts for tools and actions.

**Files to Create**:
- `apps/editor/src/hooks/useKeyboardShortcuts.ts`

**Implementation Steps**:
1. Create useKeyboardShortcuts hook
2. Define shortcuts object (B, F, E, S, V, R, Ctrl+Z, etc.)
3. Add keydown event listener
4. Parse key combinations (ctrl, shift, alt)
5. Call appropriate action from store
6. Prevent default browser behavior

**Acceptance Criteria**:
- [ ] B key activates Brush tool
- [ ] F key activates Fill tool
- [ ] Ctrl+Z triggers undo
- [ ] Ctrl+S triggers save
- [ ] Shortcuts work globally in editor

---

#### Task 4.3: Undo/Redo System
**Estimated Time**: 8 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Implement undo/redo using command pattern.

**Files to Create**:
- `apps/editor/src/lib/commands/Command.ts`
- `apps/editor/src/lib/commands/PaintTileCommand.ts`
- `apps/editor/src/lib/commands/CommandManager.ts`

**Implementation Steps**:
1. Create Command interface (execute, undo methods)
2. Create PaintTileCommand class
3. Create CommandManager with undo/redo stacks
4. Add commandManager to mapStore
5. Wrap tool actions in commands
6. Add undo/redo actions to editorStore

**Acceptance Criteria**:
- [ ] Painting tiles can be undone
- [ ] Undo can be redone
- [ ] Undo stack has max size (50 commands)
- [ ] Ctrl+Z and Ctrl+Y work correctly

---

### Week 5: Tile Palette & Inspector

#### Task 5.1: TilePalette Component
**Estimated Time**: 10 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Create tile palette with tileset selector and filtering.

**Files to Create**:
- `apps/editor/src/components/Editor/TilePalette/TilePalette.tsx`
- `apps/editor/src/components/Editor/TilePalette/TileGrid.tsx`
- `apps/editor/src/stores/tilesetStore.ts`

**Implementation Steps**:
1. Create TilePalette component with Box layout
2. Add tileset selector (MUI Select)
3. Add filter dropdown (All, Grass, Stone, etc.)
4. Create tilesetStore with Zustand
5. Create TileGrid component with scrollable grid
6. Render tiles from active tileset
7. Handle tile selection (update editorStore)

**Acceptance Criteria**:
- [ ] Tileset selector shows all tilesets
- [ ] Filter dropdown shows available tags
- [ ] Tiles display in grid (16 columns)
- [ ] Selected tile is highlighted
- [ ] Clicking tile updates selectedTileId

---

#### Task 5.2: Tile Filtering
**Estimated Time**: 6 hours  
**Priority**: Medium  
**Status**: ⏳ Not Started

**Description**: Implement tile filtering by tags.

**Files to Modify**:
- `apps/editor/src/components/Editor/TilePalette/TileGrid.tsx`
- `apps/editor/src/stores/tilesetStore.ts`

**Implementation Steps**:
1. Add filterTiles function to tilesetStore
2. Implement filter logic (All, specific tag, Tagged Only, Untagged)
3. Update TileGrid to use filtered tiles
4. Add "No tiles found" message
5. Update filter dropdown based on available tags

**Acceptance Criteria**:
- [ ] Filter "All" shows all tiles
- [ ] Filter "Grass" shows only grass-tagged tiles
- [ ] Filter "Tagged Only" shows tiles with any tags
- [ ] Filter "Untagged" shows tiles without tags
- [ ] Empty state shows helpful message

---

#### Task 5.3: Inspector Component
**Estimated Time**: 8 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Create inspector panel with contextual properties.

**Files to Create**:
- `apps/editor/src/components/Editor/Inspector/Inspector.tsx`
- `apps/editor/src/components/Editor/Inspector/MapInspector.tsx`
- `apps/editor/src/components/Editor/Inspector/EntityInspector.tsx`

**Implementation Steps**:
1. Create Inspector component with Box layout
2. Create MapInspector with MUI Accordion sections
3. Add Properties section (name, size, tileset, BGM)
4. Add Layers section (checkboxes for each layer)
5. Add Details section (cursor position, selected tile)
6. Create EntityInspector (name, type, sprite, position)
7. Switch inspector content based on selection type

**Acceptance Criteria**:
- [ ] Inspector shows MapInspector when map selected
- [ ] Inspector shows EntityInspector when entity selected
- [ ] Properties can be edited
- [ ] Layer toggles work
- [ ] Details update in real-time

---

## Phase 3: Tile Tagging & Polish (Weeks 6-8)

### Week 6: Tile Tagging System

#### Task 6.1: Extend Type Definitions
**Estimated Time**: 3 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Extend TileDefinition and Tileset types.

**Files to Modify**:
- `packages/types/src/tileset.ts`

**Implementation Steps**:
1. Add optional `tags` field to TileDefinition
2. Add `source` field to Tileset ('ai-generated' | 'user-imported')
3. Create TilesetMetadata interface
4. Add optional `metadata` field to Tileset
5. Export new types

**Acceptance Criteria**:
- [ ] TileDefinition has optional tags field
- [ ] Tileset has source field
- [ ] Tileset has optional metadata field
- [ ] Types compile without errors

---

#### Task 6.2: Tag API Endpoints
**Estimated Time**: 6 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Create API endpoints for tile tagging.

**Files to Create**:
- `apps/editor/src/app/api/tilesets/[tilesetId]/tags/route.ts`

**Files to Modify**:
- `apps/editor/src/app/api/tilesets/route.ts`
- `apps/editor/src/app/api/projects/[projectId]/tilesets/generate/route.ts`

**Implementation Steps**:
1. Create POST /api/tilesets/[tilesetId]/tags endpoint
2. Create DELETE /api/tilesets/[tilesetId]/tags endpoint
3. Create GET /api/tilesets/[tilesetId]/tags endpoint
4. Update tileset creation to accept source and metadata
5. Update AI generation to include automatic tags
6. Add validation for tag format

**Acceptance Criteria**:
- [ ] POST endpoint adds tags to tiles
- [ ] DELETE endpoint removes tags from tiles
- [ ] GET endpoint returns available tags
- [ ] AI generation includes tags
- [ ] Tags are validated (lowercase, alphanumeric)

---

#### Task 6.3: Manual Tagging UI
**Estimated Time**: 6 hours  
**Priority**: Medium  
**Status**: ⏳ Not Started

**Description**: Add UI for manually tagging tiles.

**Files to Create**:
- `apps/editor/src/components/Editor/TilePalette/TileContextMenu.tsx`
- `apps/editor/src/components/Editor/TilePalette/TagDialog.tsx`

**Implementation Steps**:
1. Create TileContextMenu component
2. Add "Add Tag" menu item
3. Create TagDialog with tag input and existing tags list
4. Add tag validation (lowercase, alphanumeric, max 5 tags)
5. Call API endpoint to save tags
6. Update tilesetStore after tagging

**Acceptance Criteria**:
- [ ] Right-clicking tile shows context menu
- [ ] "Add Tag" opens dialog
- [ ] Dialog shows existing tags
- [ ] New tags can be added
- [ ] Tags are saved to database

---

#### Task 6.4: Database Migration
**Estimated Time**: 3 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Migrate existing tilesets to include source and metadata.

**Files to Create**:
- `scripts/migrate-tilesets.ts`

**Implementation Steps**:
1. Create migration script
2. Update all existing tilesets with source: 'user-imported'
3. Add metadata: { generatedBy: 'manual', tags: [] }
4. Run migration on staging database
5. Verify migration results
6. Run migration on production database

**Acceptance Criteria**:
- [ ] All existing tilesets have source field
- [ ] All existing tilesets have metadata field
- [ ] No data loss during migration
- [ ] Migration is idempotent

---

### Week 7: Context Menus & Shortcuts

#### Task 7.1: Complete Context Menus
**Estimated Time**: 6 hours  
**Priority**: Medium  
**Status**: ⏳ Not Started

**Description**: Add context menus for all explorer items.

**Files to Create**:
- `apps/editor/src/components/Editor/ProjectExplorer/EntityContextMenu.tsx`
- `apps/editor/src/components/Editor/ProjectExplorer/AssetContextMenu.tsx`

**Implementation Steps**:
1. Create EntityContextMenu (New Entity, Edit, Duplicate, Delete)
2. Create AssetContextMenu (Import, Generate, Delete)
3. Add right-click handlers to EntitiesTree and AssetsTree
4. Implement action handlers
5. Add confirmation dialogs

**Acceptance Criteria**:
- [ ] Right-clicking entity shows context menu
- [ ] Right-clicking asset shows context menu
- [ ] All actions work correctly
- [ ] Confirmation dialogs appear for destructive actions

---

#### Task 7.2: Tooltips
**Estimated Time**: 3 hours  
**Priority**: Low  
**Status**: ⏳ Not Started

**Description**: Add tooltips to all tools and buttons.

**Files to Modify**:
- `apps/editor/src/components/Editor/TopBar/Toolbar.tsx`
- `apps/editor/src/components/Editor/Canvas/CanvasControls.tsx`

**Implementation Steps**:
1. Add MUI Tooltip to all toolbar buttons
2. Include keyboard shortcut in tooltip text
3. Add tooltips to canvas controls
4. Add tooltips to inspector buttons
5. Test tooltip positioning

**Acceptance Criteria**:
- [ ] All toolbar buttons have tooltips
- [ ] Tooltips show keyboard shortcuts
- [ ] Tooltips appear on hover
- [ ] Tooltips don't block UI

---

### Week 8: Polish & Testing

#### Task 8.1: Loading States
**Estimated Time**: 4 hours  
**Priority**: Medium  
**Status**: ⏳ Not Started

**Description**: Add loading states and error handling.

**Files to Modify**:
- `apps/editor/src/components/Editor/ProjectExplorer/MapsTree.tsx`
- `apps/editor/src/components/Editor/TilePalette/TilePalette.tsx`

**Implementation Steps**:
1. Add loading state to tree views (MUI Skeleton)
2. Add error state with retry button
3. Add loading state to tile palette
4. Add empty state messages
5. Add error boundaries

**Acceptance Criteria**:
- [ ] Loading skeletons show while fetching data
- [ ] Error messages are helpful
- [ ] Retry button works
- [ ] Empty states guide user

---

#### Task 8.2: Responsive Design
**Estimated Time**: 6 hours  
**Priority**: Medium  
**Status**: ⏳ Not Started

**Description**: Implement responsive design for different screen sizes.

**Files to Modify**:
- `apps/editor/src/components/Editor/EditorLayout.tsx`
- `apps/editor/src/components/Editor/ProjectExplorer/ProjectExplorer.tsx`

**Implementation Steps**:
1. Add MUI useMediaQuery hook
2. Auto-collapse panels on small screens (< 960px)
3. Show mobile warning on very small screens
4. Test on 1920x1080 and 2560x1440
5. Adjust panel sizes for different breakpoints

**Acceptance Criteria**:
- [ ] Layout works on 1920x1080
- [ ] Layout works on 2560x1440
- [ ] Panels auto-collapse on small screens
- [ ] Mobile warning shows on mobile

---

#### Task 8.3: Performance Optimization
**Estimated Time**: 6 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Optimize canvas rendering and UI performance.

**Files to Modify**:
- `apps/editor/src/hooks/useCanvasRenderer.ts`
- `apps/editor/src/components/Editor/TilePalette/TileGrid.tsx`

**Implementation Steps**:
1. Implement dirty rectangle rendering in canvas
2. Memoize expensive computations in components
3. Virtualize tile grid for large tilesets
4. Debounce panel resize saves
5. Profile and optimize hot paths

**Acceptance Criteria**:
- [ ] Canvas renders at 60 FPS
- [ ] Panel resize is smooth
- [ ] Tile palette scrolls smoothly
- [ ] No unnecessary re-renders

---

#### Task 8.4: Unit Tests
**Estimated Time**: 8 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Write unit tests for stores and components.

**Files to Create**:
- `apps/editor/src/stores/__tests__/editorStore.test.ts`
- `apps/editor/src/stores/__tests__/mapStore.test.ts`
- `apps/editor/src/components/shared/__tests__/ResizablePanel.test.tsx`

**Implementation Steps**:
1. Set up testing environment (Jest, React Testing Library)
2. Write tests for editorStore actions
3. Write tests for mapStore actions
4. Write tests for ResizablePanel component
5. Achieve >80% code coverage

**Acceptance Criteria**:
- [ ] All store actions have tests
- [ ] ResizablePanel component has tests
- [ ] Tests pass with `npm run test`
- [ ] Code coverage >80%

---

#### Task 8.5: E2E Tests
**Estimated Time**: 8 hours  
**Priority**: High  
**Status**: ⏳ Not Started

**Description**: Write E2E tests for editor workflow.

**Files to Create**:
- `apps/editor/e2e/editor-layout.spec.ts`
- `apps/editor/e2e/tile-palette.spec.ts`

**Implementation Steps**:
1. Set up Playwright (if not already)
2. Write test: Open project → Navigate to map
3. Write test: Resize panels → Verify persistence
4. Write test: Select tileset → Filter tiles → Paint on canvas
5. Write test: Right-click map → Create new map
6. Write test: Add tags to tiles → Filter by tag

**Acceptance Criteria**:
- [ ] All E2E tests pass
- [ ] Tests run with `npm run test:e2e`
- [ ] Tests cover critical workflows
- [ ] Tests are reliable (no flakiness)

---

## Summary

**Total Tasks**: 35  
**Total Estimated Time**: 6-8 weeks  
**Priority Breakdown**:
- High: 22 tasks
- Medium: 11 tasks
- Low: 2 tasks

**Phase Breakdown**:
- Phase 1 (Weeks 1-2): 10 tasks
- Phase 2 (Weeks 3-5): 12 tasks
- Phase 3 (Weeks 6-8): 13 tasks
