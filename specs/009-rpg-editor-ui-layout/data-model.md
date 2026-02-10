# Data Model: Editor UI Layout

This document outlines the data structures for the editor UI layout, including state management types and extended tileset metadata. These types will be implemented in `packages/types/src/` and editor stores.

## EditorLayoutState

Manages the layout configuration and panel sizes.

```typescript
export interface EditorLayoutState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarWidth: number;  // 200-400px
  rightSidebarWidth: number; // 250-500px
  tilePaletteHeight: number; // 150-300px
}
```

**Default Values:**
- `leftSidebarOpen`: `true`
- `rightSidebarOpen`: `true`
- `leftSidebarWidth`: `250`
- `rightSidebarWidth`: `300`
- `tilePaletteHeight`: `200`

**Persistence**: Stored in `localStorage` as `rpg-studio-layout`

---

## SelectionState

Tracks the currently selected item in the editor.

```typescript
export type SelectionType = 'map' | 'entity' | 'tile' | 'tileset' | 'charset' | 'sound' | null;

export interface SelectionState {
  type: SelectionType;
  id: string | null;
  data: any; // The actual selected object (Map, Entity, etc.)
}
```

**Examples:**
```typescript
// Map selected
{ type: 'map', id: 'map-123', data: { id: 'map-123', name: 'Town', ... } }

// Entity selected
{ type: 'entity', id: 'entity-456', data: { id: 'entity-456', type: 'npc', ... } }

// Tile selected in palette
{ type: 'tile', id: '42', data: { id: 42, x: 64, y: 0, tags: ['grass'] } }
```

---

## ToolState

Manages the active drawing tool and its options.

```typescript
export type ToolType = 'brush' | 'fill' | 'eraser' | 'select' | 'entity' | 'region';

export interface ToolState {
  activeTool: ToolType;
  brushSize: number;    // 1-10
  opacity: number;      // 0-100
  selectedTileId: number | null;
}
```

**Default Values:**
- `activeTool`: `'brush'`
- `brushSize`: `1`
- `opacity`: `100`
- `selectedTileId`: `null`

---

## ProjectExplorerState

Manages the expanded/collapsed state of folders in the project explorer.

```typescript
export interface ProjectExplorerState {
  expandedFolders: Set<string>; // Set of folder IDs that are expanded
  selectedItemId: string | null;
  selectedItemType: 'map' | 'entity' | 'tileset' | 'charset' | 'sound' | null;
}
```

**Example:**
```typescript
{
  expandedFolders: new Set(['maps', 'entities', 'entities-npcs', 'assets']),
  selectedItemId: 'map-123',
  selectedItemType: 'map'
}
```

---

## TileDefinition (Extended)

Extended from existing type to include optional tagging metadata.

```typescript
export interface TileDefinition {
  id: number;
  x: number;  // Position in tileset image (pixels)
  y: number;  // Position in tileset image (pixels)
  tags?: string[];  // Optional: ["grass", "outdoor", "ground"]
  collision?: boolean;
  autotile?: AutotileConfig;
}
```

**Tagging Rules:**
- Tags are **optional** - tiles work without them
- AI-generated tilesets include automatic tags
- User-imported tilesets start with no tags
- Users can manually add tags via context menu
- Common tags: `grass`, `stone`, `water`, `wood`, `path`, `wall`, `floor`, `decoration`

---

## TilesetMetadata (New)

Metadata for tilesets, especially AI-generated ones.

```typescript
export interface TilesetMetadata {
  style?: string;           // "Grassland", "Stone Dungeon", etc.
  generatedBy?: 'gemini' | 'manual';
  generatedAt?: string;     // ISO date string
  prompt?: string;          // Original AI prompt
  tags?: string[];          // Available tags in this tileset
}
```

**Example (AI-generated):**
```typescript
{
  style: 'Grassland',
  generatedBy: 'gemini',
  generatedAt: '2026-02-01T18:00:00Z',
  prompt: 'Medieval fantasy grassland tileset',
  tags: ['grass', 'stone', 'path', 'flower']
}
```

**Example (User-imported):**
```typescript
{
  generatedBy: 'manual',
  tags: [] // Empty until user adds tags
}
```

---

## Tileset (Extended)

Extended from existing type to include metadata and source.

```typescript
export interface Tileset {
  id: string;
  name: string;
  imageUrl: string;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  tiles: TileDefinition[];
  source: 'ai-generated' | 'user-imported';  // NEW
  metadata?: TilesetMetadata;                 // NEW
  projectId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## TilePaletteState

Manages the tile palette UI state.

```typescript
export interface TilePaletteState {
  activeTilesetId: string | null;
  filterTag: string;  // 'All', 'Grass', 'Stone', 'Tagged Only', 'Untagged'
  selectedTileIds: number[];  // For multi-select (future)
  searchQuery: string;  // For search (future)
}
```

**Default Values:**
- `activeTilesetId`: First tileset in project
- `filterTag`: `'All'`
- `selectedTileIds`: `[]`
- `searchQuery`: `''`

---

## InspectorState

Manages the inspector panel state.

```typescript
export interface InspectorState {
  expandedSections: Set<string>;  // Set of section IDs that are expanded
}
```

**Example:**
```typescript
{
  expandedSections: new Set(['properties', 'layers', 'details'])
}
```

---

## KeyboardShortcut

Defines keyboard shortcuts for the editor.

```typescript
export interface KeyboardShortcut {
  key: string;          // 'b', 'ctrl+z', 'ctrl+shift+s'
  description: string;  // 'Brush Tool'
  action: () => void;   // Function to execute
}
```

**Example Shortcuts:**
```typescript
const shortcuts: KeyboardShortcut[] = [
  { key: 'b', description: 'Brush Tool', action: () => setActiveTool('brush') },
  { key: 'f', description: 'Fill Tool', action: () => setActiveTool('fill') },
  { key: 'e', description: 'Eraser Tool', action: () => setActiveTool('eraser') },
  { key: 's', description: 'Select Tool', action: () => setActiveTool('select') },
  { key: 'v', description: 'Entity Tool', action: () => setActiveTool('entity') },
  { key: 'r', description: 'Region Tool', action: () => setActiveTool('region') },
  { key: 'ctrl+z', description: 'Undo', action: () => undo() },
  { key: 'ctrl+y', description: 'Redo', action: () => redo() },
  { key: 'ctrl+s', description: 'Save', action: () => saveMap() },
];
```

---

## ContextMenuItem

Defines items in right-click context menus.

```typescript
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;  // Render as separator
  children?: ContextMenuItem[];  // Submenu
}
```

**Example (Map Context Menu):**
```typescript
const mapContextMenu: ContextMenuItem[] = [
  { id: 'new-map', label: 'New Map', icon: '🗺', action: () => createMap() },
  { id: 'duplicate', label: 'Duplicate', icon: '📋', action: () => duplicateMap() },
  { separator: true },
  { id: 'delete', label: 'Delete', icon: '🗑', action: () => deleteMap() },
  { separator: true },
  { id: 'properties', label: 'Properties', icon: '⚙', action: () => openProperties() },
];
```

---

## Validation Rules

### EditorLayoutState
- `leftSidebarWidth`: 200 ≤ value ≤ 400
- `rightSidebarWidth`: 250 ≤ value ≤ 500
- `tilePaletteHeight`: 150 ≤ value ≤ 300

### SelectionState
- `id` must be valid and exist in project data
- `data` must match the type specified in `type`

### ToolState
- `brushSize`: 1 ≤ value ≤ 10
- `opacity`: 0 ≤ value ≤ 100
- `selectedTileId` must be valid tile ID from active tileset

### TileDefinition
- `tags` array must contain only lowercase alphanumeric strings
- `tags` must be unique within the array
- Maximum 5 tags per tile

### Tileset
- `source` must be either 'ai-generated' or 'user-imported'
- If `source` is 'ai-generated', `metadata.generatedBy` must be 'gemini'
- If `source` is 'user-imported', `metadata.generatedBy` must be 'manual'

---

## LocalStorage Schema

### Layout Preferences
**Key**: `rpg-studio-layout`

```json
{
  "leftSidebarOpen": true,
  "rightSidebarOpen": true,
  "leftSidebarWidth": 250,
  "rightSidebarWidth": 300,
  "tilePaletteHeight": 200
}
```

### Project Explorer State
**Key**: `rpg-studio-explorer-{projectId}`

```json
{
  "expandedFolders": ["maps", "entities", "assets"],
  "selectedItemId": "map-123",
  "selectedItemType": "map"
}
```

### Inspector State
**Key**: `rpg-studio-inspector`

```json
{
  "expandedSections": ["properties", "layers"]
}
```

---

## Migration Notes

### Backward Compatibility

**Existing Tilesets:**
- Add `source: 'user-imported'` to all existing tilesets
- Add `metadata: { generatedBy: 'manual', tags: [] }`
- Existing `tiles` array remains unchanged (no tags)

**Existing Maps:**
- No changes required
- Continue to work with existing layer structure

**New Features:**
- Tile tagging is opt-in
- Filter defaults to "All" (shows all tiles)
- Layout preferences default to standard values if not in localStorage
