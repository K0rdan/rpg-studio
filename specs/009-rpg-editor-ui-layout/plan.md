# Implementation Plan: Editor UI Layout

## Overview
This feature implements a modern, professional editor UI layout with hierarchical project navigation, resizable panels, and tile tagging system. The implementation follows a phased approach over 6-8 weeks.

## Architecture Decisions

### Component Structure
- **MUI-based components**: Use Material-UI for consistent styling and accessibility
- **Zustand for state**: Lightweight state management for editor, map, and selection state
- **ResizablePanel pattern**: Reusable component for all resizable panels
- **Contextual Inspector**: Dynamic content based on selection type

### State Management Strategy
```
stores/
├── editorStore.ts      # Layout, tools, keyboard shortcuts
├── mapStore.ts         # Active map, layers, cursor position
├── selectionStore.ts   # Selected item (map, entity, tile)
└── tilesetStore.ts     # Active tileset, filter, tags
```

### Integration Points
1. **Canvas Rendering**: Use existing `@rpg-studio/core` MapRenderer
2. **API Endpoints**: Use existing endpoints, add new ones for tags
3. **Type Extensions**: Extend `Tileset` and `TileDefinition` in `@rpg-studio/types`
4. **Storage**: Persist layout preferences to localStorage

## Phase 1: Core Layout (Weeks 1-2)

### Week 1: Layout Foundation
**Files to Create:**
- `apps/editor/src/components/Editor/EditorLayout.tsx`
- `apps/editor/src/components/shared/ResizablePanel.tsx`
- `apps/editor/src/components/Editor/TopBar/MenuBar.tsx`
- `apps/editor/src/components/Editor/TopBar/Toolbar.tsx`
- `apps/editor/src/stores/editorStore.ts`
- `apps/editor/src/hooks/useLayoutPersistence.ts`

**Implementation:**
1. Create `EditorLayout` component with 3-panel structure (left, center, right)
2. Implement `ResizablePanel` with drag-to-resize functionality
3. Build `TopBar` with menu and toolbar
4. Set up Zustand store for layout state
5. Add localStorage persistence for panel sizes

### Week 2: Project Explorer
**Files to Create:**
- `apps/editor/src/components/Editor/ProjectExplorer/ProjectExplorer.tsx`
- `apps/editor/src/components/Editor/ProjectExplorer/MapsTree.tsx`
- `apps/editor/src/components/Editor/ProjectExplorer/EntitiesTree.tsx`
- `apps/editor/src/components/Editor/ProjectExplorer/AssetsTree.tsx`
- `apps/editor/src/components/shared/ContextMenu.tsx`

**Implementation:**
1. Build `ProjectExplorer` with MUI TreeView
2. Create separate tree components for Maps, Entities, Assets
3. Add icons and expand/collapse functionality
4. Implement context menus (New, Delete, Duplicate, Properties)
5. Connect to existing API endpoints

## Phase 2: Map Editor Integration (Weeks 3-5)

### Week 3: Canvas Integration
**Files to Create:**
- `apps/editor/src/components/Editor/Canvas/MapCanvas.tsx`
- `apps/editor/src/components/Editor/Canvas/CanvasControls.tsx`
- `apps/editor/src/stores/mapStore.ts`
- `apps/editor/src/hooks/useCanvasRenderer.ts`
- `apps/editor/src/lib/canvas/mapRenderer.ts`

**Implementation:**
1. Create `MapCanvas` component with HTML5 canvas
2. Integrate `@rpg-studio/core` MapRenderer
3. Add grid overlay, zoom, and pan controls
4. Set up map store with Zustand
5. Handle canvas resize and responsiveness

### Week 4: Drawing Tools
**Files to Create:**
- `apps/editor/src/lib/tools/brushTool.ts`
- `apps/editor/src/lib/tools/fillTool.ts`
- `apps/editor/src/lib/tools/eraserTool.ts`
- `apps/editor/src/lib/tools/selectTool.ts`
- `apps/editor/src/hooks/useKeyboardShortcuts.ts`

**Implementation:**
1. Implement tool classes (Brush, Fill, Eraser, Select)
2. Connect tools to canvas mouse events
3. Add tool switching in toolbar
4. Implement keyboard shortcuts (B, F, E, S)
5. Add undo/redo system (command pattern)

### Week 5: Tile Palette & Inspector
**Files to Create:**
- `apps/editor/src/components/Editor/TilePalette/TilePalette.tsx`
- `apps/editor/src/components/Editor/TilePalette/TileGrid.tsx`
- `apps/editor/src/components/Editor/Inspector/Inspector.tsx`
- `apps/editor/src/components/Editor/Inspector/MapInspector.tsx`
- `apps/editor/src/components/Editor/Inspector/EntityInspector.tsx`
- `apps/editor/src/stores/tilesetStore.ts`

**Implementation:**
1. Build `TilePalette` with tileset selector and filter
2. Create `TileGrid` with scrollable tile display
3. Implement tile selection and highlighting
4. Build `Inspector` with contextual panels
5. Add layer management and property editing

## Phase 3: Tile Tagging & Polish (Weeks 6-8)

### Week 6: Tile Tagging System
**Files to Modify:**
- `packages/types/src/tileset.ts` (extend TileDefinition, Tileset)
- `apps/editor/src/app/api/tilesets/route.ts` (add tag endpoints)
- `apps/editor/src/app/api/tilesets/[tilesetId]/tags/route.ts` (new)

**Implementation:**
1. Extend `TileDefinition` with optional `tags` field
2. Extend `Tileset` with `source` and `metadata` fields
3. Add API endpoint for adding/removing tags
4. Implement tag filtering in tile palette
5. Add context menu for manual tagging

### Week 7: Context Menus & Shortcuts
**Files to Create:**
- `apps/editor/src/components/Editor/ProjectExplorer/MapContextMenu.tsx`
- `apps/editor/src/components/Editor/ProjectExplorer/EntityContextMenu.tsx`
- `apps/editor/src/components/Editor/TilePalette/TileContextMenu.tsx`

**Implementation:**
1. Build context menus for all explorer items
2. Implement actions (New, Delete, Duplicate, Properties)
3. Add tile tagging context menu
4. Complete keyboard shortcut system
5. Add tooltips to all tools

### Week 8: Polish & Testing
**Files to Create:**
- `apps/editor/src/components/Editor/__tests__/EditorLayout.test.tsx`
- `apps/editor/src/stores/__tests__/editorStore.test.ts`
- `apps/editor/e2e/editor-layout.spec.ts`

**Implementation:**
1. Add loading states and error handling
2. Implement responsive design breakpoints
3. Optimize canvas rendering (dirty rectangles)
4. Write unit tests for stores and components
5. Write E2E tests for editor workflow
6. Bug fixes and performance optimization

## Type Extensions

### packages/types/src/tileset.ts
```typescript
// Add to existing TileDefinition
export interface TileDefinition {
  id: number;
  x: number;
  y: number;
  tags?: string[];  // NEW - optional tags
  collision?: boolean;
  autotile?: AutotileConfig;
}

// Add new metadata type
export interface TilesetMetadata {
  style?: string;
  generatedBy?: 'gemini' | 'manual';
  generatedAt?: string;
  prompt?: string;
  tags?: string[];
}

// Extend existing Tileset
export interface Tileset {
  // ... existing fields
  source: 'ai-generated' | 'user-imported';  // NEW
  metadata?: TilesetMetadata;                 // NEW
}
```

## API Endpoints

### New Endpoints
- `POST /api/tilesets/[tilesetId]/tags` - Add tags to tiles
- `DELETE /api/tilesets/[tilesetId]/tags` - Remove tags from tiles
- `GET /api/tilesets/[tilesetId]/tags` - Get available tags

### Modified Endpoints
- `POST /api/projects/[projectId]/tilesets/generate` - Include tags in response
- `POST /api/tilesets` - Accept source and metadata fields

## Database Migrations

### Tileset Collection
```javascript
// Add fields to existing documents
db.tilesets.updateMany(
  { source: { $exists: false } },
  { 
    $set: { 
      source: 'user-imported',
      metadata: { generatedBy: 'manual', tags: [] }
    } 
  }
);
```

## Testing Strategy

### Unit Tests
**Files:**
- `apps/editor/src/stores/__tests__/editorStore.test.ts`
- `apps/editor/src/stores/__tests__/mapStore.test.ts`
- `apps/editor/src/components/shared/__tests__/ResizablePanel.test.tsx`

**Coverage:**
- Store actions and state updates
- Panel resize logic
- Tool switching
- Keyboard shortcuts

**Run Command:**
```bash
cd apps/editor
npm run test
```

### Integration Tests
**Files:**
- `apps/editor/src/components/Editor/__tests__/EditorLayout.test.tsx`
- `apps/editor/src/components/Editor/TilePalette/__tests__/TilePalette.test.tsx`

**Coverage:**
- Component rendering
- Selection state sync
- Filter logic
- Context menu actions

**Run Command:**
```bash
cd apps/editor
npm run test
```

### E2E Tests (Playwright)
**Files:**
- `apps/editor/e2e/editor-layout.spec.ts`
- `apps/editor/e2e/tile-palette.spec.ts`
- `apps/editor/e2e/project-explorer.spec.ts`

**Coverage:**
- Open project → Navigate to map
- Resize panels → Verify persistence
- Select tileset → Filter tiles → Paint on canvas
- Right-click map → Create new map
- Add tags to tiles → Filter by tag

**Run Command:**
```bash
cd apps/editor
npm run test:e2e
```

## Verification Plan

### Automated Tests
1. **Unit Tests**: Run `npm run test` in `apps/editor`
   - Verify all stores work correctly
   - Verify ResizablePanel component
   - Verify keyboard shortcuts

2. **Integration Tests**: Run `npm run test` in `apps/editor`
   - Verify EditorLayout renders correctly
   - Verify TilePalette filtering works
   - Verify Inspector updates on selection

3. **E2E Tests**: Run `npm run test:e2e` in `apps/editor`
   - Verify complete editor workflow
   - Verify panel resize and persistence
   - Verify tile tagging workflow

### Manual Testing
1. **Layout Verification**:
   - Open editor → Verify 3-panel layout displays
   - Resize left panel → Refresh → Verify size persists
   - Resize right panel → Refresh → Verify size persists
   - Collapse/expand panels → Verify functionality

2. **Project Explorer**:
   - Expand Maps folder → Verify maps display
   - Right-click map → Verify context menu appears
   - Click "New Map" → Verify modal opens
   - Navigate to Entities → Verify Player/NPCs/Enemies subfolders

3. **Tile Palette**:
   - Select tileset → Verify tiles display in grid
   - Change filter to "Grass" → Verify only grass tiles show
   - Select tile → Verify selection highlights
   - Right-click tile → Add tag → Verify tag added

4. **Inspector**:
   - Select map → Verify Map Properties display
   - Edit map name → Verify update works
   - Toggle layer → Verify layer visibility changes
   - Select entity → Verify Entity Properties display

5. **Keyboard Shortcuts**:
   - Press B → Verify Brush tool activates
   - Press F → Verify Fill tool activates
   - Press Ctrl+Z → Verify undo works
   - Press Ctrl+S → Verify save works

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Canvas performance issues | Use dirty rectangle rendering, optimize early |
| Complex state management | Keep stores simple, use Zustand selectors |
| Panel resize bugs | Thorough testing, use constraints |
| Tile tagging complexity | Make it optional, default to "All" filter |
| Scope creep | Defer modular layout to post-MVP |

## Dependencies

### New Dependencies
```json
{
  "@mui/x-tree-view": "^7.0.0",
  "zustand": "^4.5.0"
}
```

### Existing Dependencies
- `@mui/material`: Already installed
- `@rpg-studio/core`: Already exists
- `@rpg-studio/types`: Already exists

## Rollout Plan

### Phase 1 (Weeks 1-2)
- Deploy core layout to staging
- Internal testing of panel resize
- Gather feedback on layout

### Phase 2 (Weeks 3-5)
- Deploy map editor integration
- Internal testing of drawing tools
- Gather feedback on workflow

### Phase 3 (Weeks 6-8)
- Deploy tile tagging system
- Beta testing with select users
- Gather feedback on tagging UX
- Production deployment

## Success Metrics

### Performance
- Panel resize: 60 FPS
- Canvas rendering: 60 FPS
- Tree view render: < 100ms for 100 items
- Tile palette scroll: 60 FPS

### Functionality
- All keyboard shortcuts work
- Panel sizes persist correctly
- Context menus work on all items
- Tile filtering works correctly
- Inspector updates instantly

### User Experience
- Layout feels intuitive
- Tools are easy to find
- Tile tagging is optional but useful
- No critical bugs

## Post-MVP Enhancements

### Phase 4 (Future)
- Modular panel docking (VS Code style)
- Save/load workspace layouts
- Multi-monitor support
- Drag-and-drop in project explorer
- Search in project explorer
- Minimap for canvas
- Advanced auto-tiling
