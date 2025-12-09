# Implementation Plan - Editor Preview

## Phase 1: Core Foundation
1. **GameEngine Enhancement**
   - ✅ Accept direct data objects in `init(project, maps, tilesets)`
   - ✅ Use tileset's actual dimensions (tile_width, tile_height)
   - ✅ Add comprehensive console logging
   - ✅ Handle empty maps gracefully

2. **AssetLoader System**
   - ✅ Create `AssetLoader` class with retry logic
   - ✅ Implement timeout protection (15s per attempt)
   - ✅ Add smart caching mechanism
   - ✅ Generate fallback images for missing assets
   - ✅ Detailed error logging with path information
   - ✅ Export from `@packages/core` package

## Phase 2: Editor Integration
1. **PreviewContext Provider**
   - ✅ Create React Context for preview state
   - ✅ Implement `play(projectId)` action
   - ✅ Implement `pause()`, `resume()`, `close()` actions
   - ✅ Handle data fetching from API
   - ✅ Wrap application in PreviewProvider

2. **API Route**
   - ✅ Create `/api/projects/[projectId]/preview/route.ts`
   - ✅ Aggregate Project, Maps, Tilesets, Characters
   - ✅ Return complete game state in single request
   - ✅ Handle missing project gracefully

3. **Play Button Integration**
   - ✅ Add Play button to MapEditor toolbar
   - ✅ Connect to PreviewContext.play()
   - ✅ Pass current projectId
   - ✅ Material-UI PlayArrowIcon styling

## Phase 3: Preview Modal
1. **Modal Component**
   - ✅ Fullscreen MUI Dialog with Slide transition
   - ✅ AppBar with title and controls
   - ✅ Canvas container with responsive centering
   - ✅ Callback ref pattern for canvas mount detection
   - ✅ `canvasReady` state for initialization timing

2. **Game Loop Controls**
   - ✅ Close button (stops engine and closes modal)
   - ✅ Pause/Play toggle button
   - ✅ Stop button (same as close)
   - ✅ IconButton styling with MUI

3. **Canvas Lifecycle**
   - ✅ Callback ref: `canvasCallbackRef(node)`
   - ✅ Set `canvasReady` state on mount
   - ✅ useEffect watches canvasReady state
   - ✅ Initialize GameEngine when ready
   - ✅ Clean up on unmount

## Phase 4: Debugging Tools
1. **Debug Information Panel**
   - ✅ Dark panel with monospace font
   - ✅ Display maps count and active map name
   - ✅ Show tileset ID and count
   - ✅ Display layer count and painted tiles
   - ✅ Show map dimensions
   - ✅ Tileset load status (✅/❌)
   - ✅ Warning for empty maps

2. **Visual Debugging Controls**
   - ✅ "Show Grid" checkbox - yellow grid overlay
   - ✅ "Test Pattern" checkbox - RGB squares + text
   - ✅ "Check Canvas" button - pixel analysis
   - ✅ Checkbox state management
   - ✅ Overlay drawing in separate useEffect

3. **Console Logging**
   - ✅ PreviewModal lifecycle logs
   - ✅ Canvas mount detection logs
   - ✅ GameEngine initialization logs
   - ✅ AssetLoader detailed logs (loading, retry, success, failure)
   - ✅ MapRenderer tile count logs

## Phase 5: Data Defaults
1. **Map Creation Defaults**
   - ✅ Create maps with default "Layer 1"
   - ✅ Initialize layer data: `Array(width * height).fill(-1)`
   - ✅ Assign default tilesetId: 'ts1'
   - ✅ Update API route to include defaults

2. **Tileset Configuration**
   - ✅ Ensure 'ts1' exists in /api/tilesets
   - ✅ Configure correct dimensions (128×128)
   - ✅ Verify image path (/tileset_fixed.png)

## Phase 6: Testing
1. **E2E Tests** (Cypress)
   - ✅ Create `preview_flow.cy.ts`
   - ✅ Test: Create project → Create map → Open preview
   - ✅ Verify modal opens with correct title
   - ✅ Verify canvas exists with valid dimensions
   - ✅ Verify close button works
   - ✅ Test default layer creation
   - ✅ Handle test data cleanup

2. **Manual Testing**
   - ✅ Test with empty map (no tiles painted)
   - ✅ Test with painted tiles
   - ✅ Test pause/resume functionality
   - ✅ Test with missing tileset image
   - ✅ Verify debug tools work correctly
   - ✅ Test canvas mount timing

## Phase 7: Error Handling
1. **AssetLoader Error Cases**
   - ✅ Image load timeout → Retry with backoff
   - ✅ Image 404 → Retry then fallback
   - ✅ Network error → Retry then fallback
   - ✅ Fallback failure → Programmatic checkerboard

2. **GameEngine Error Cases**
   - ✅ No maps provided → Log warning and return
   - ✅ Missing tileset → Use default fallback
   - ✅ Init() rejection → Catch and log error stack
   - ✅ Canvas not available → Wait for mount

3. **UI Error Feedback**
   - ✅ Red X for failed tileset load
   - ✅ Orange warning for empty maps
   - ✅ Console error messages with paths
   - ✅ Alert for pixel analysis results

## Technical Highlights

### Canvas Mount Detection Pattern
```typescript
const [canvasReady, setCanvasReady] = useState(false);

const canvasCallbackRef = (node: HTMLCanvasElement | null) => {
  if (node) {
    canvasRef.current = node;
    setCanvasReady(true); // Triggers useEffect
  }
};

useEffect(() => {
  if (isOpen && canvasReady && canvasRef.current && !engineRef.current) {
    // Initialize GameEngine
  }
}, [isOpen, canvasReady, data]);
```

### AssetLoader Usage
```typescript
const result = await assetLoader.loadImage(path, {
  timeout: 15000,
  retries: 3
});

if (!result.success) {
  console.error('Load failed:', result.error);
  // result.asset still contains fallback image
}
```

### Debug Panel Integration
```typescript
// Shows real-time game state
→ Maps: 1 | Active Map: home
→ Tileset ID: ts1 | Available Tilesets: 1
→ Layers: 2 | Layer 1 Tiles: 300 painted
→ Map Size: 20x15
✅ Tileset Image: Loaded
```

## Dependencies
- `@packages/core` - GameEngine, AssetLoader, MapRenderer
- `@packages/types` - GameProject, Map, Tileset, Character
- `@mui/material` - Dialog, AppBar, Toolbar, Button, Checkbox
- `@mui/icons-material` - PlayArrow, Pause, Stop, Close
- Next.js App Router - API routes, context
- React - useState, useEffect, useRef, useContext, useCallback
