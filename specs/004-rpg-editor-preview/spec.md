# Feature: Editor Preview with Direct Engine

## Goal
Implement a seamless preview functionality allowing the user to play the current project directly from the Editor using the core game engine embedded in a modal dialog. The user should have control over the game loop (Play, Pause, Stop) and comprehensive debugging tools.

## User Stories
- As a game designer, I want to click "Play" in the map editor to launch the game preview with the current map data.
- As a game designer, I want to click "Pause" to suspend the game loop (e.g., to inspect the current state).
- As a game designer, I want to click "Stop" to close the preview and return to editing.
- As a game designer, I want the preview to reflect the latest changes I made in the editor without saving.
- As a game designer, I want debugging tools to diagnose rendering issues (grid overlay, test patterns, asset status).

## Architecture

### Direct Engine Embedding
The Editor (Next.js) directly embeds the `@packages/core` GameEngine in a fullscreen modal dialog, eliminating the need for a separate Player application or iframe communication.

**Benefits:**
- Simpler architecture (no postMessage protocol)
- Instant preview without network delays
- Shared asset loading between editor and preview
- Direct access to game state for debugging

### Components

#### PreviewContext (`@/context/PreviewContext.tsx`)
- React Context providing preview state and actions
- `play(projectId)` - Fetches data and opens preview modal
- `pause()` - Pauses the game loop
- `resume()` - Resumes the game loop
- `close()` - Stops engine and closes modal

#### PreviewModal (`@/components/PreviewModal.tsx`)
- Fullscreen MUI Dialog with Slide transition
- Embeds HTML5 Canvas for game rendering
- Control toolbar (Close, Pause/Play, Stop)
- Debug information panel
- Visual debugging controls

#### API Route (`/api/projects/[projectId]/preview/route.ts`)
- Aggregates all data needed for preview
- Returns: Project, Maps, Tilesets, Characters
- Single API call for complete game state

### Asset Loading System

#### AssetLoader (`@packages/core/src/AssetLoader.ts`)
- Robust image loading with retry logic (3 attempts)
- Timeout protection (15 seconds per attempt)
- Smart caching for performance
- Automatic fallback images (magenta checkerboard)
- Detailed console logging for debugging

**Features:**
- Exponential backoff retry strategy
- Programmatic fallback generation
- Cache statistics and management
- Preload support for multiple assets

### Debugging Tools

#### Debug Information Panel
Real-time display of:
- Maps loaded and active map name
- Tileset ID and available tilesets count
- Layer count and painted tile count
- Map dimensions (width × height)
- Tileset image load status (✅/❌)

#### Visual Debugging Controls
- **Show Grid**: Yellow overlay showing tile boundaries
- **Test Pattern**: RGB squares proving canvas renders
- **Check Canvas**: Pixel analysis tool (counts non-black pixels)

### Technical Implementation

#### Canvas Lifecycle
1. Modal opens with Slide transition
2. Callback ref detects canvas mount
3. `canvasReady` state triggers initialization
4. GameEngine initializes with AssetLoader
5. Game loop starts automatically

#### Data Flow
```
MapEditor → Play Button Click
    ↓
PreviewContext.play(projectId)
    ↓
Fetch /api/projects/{id}/preview
    ↓
Open PreviewModal with data
    ↓
Wait for canvas mount (callback ref)
    ↓
GameEngine.init(project, maps, tilesets)
    ↓
AssetLoader loads tileset & sprites
    ↓
GameLoop.start()
```

## Requirements

### Editor Components
- **Play Button** in MapEditor toolbar
- **PreviewModal** fullscreen dialog
- **PreviewContext** for state management
- **Debug Panel** with comprehensive information
- **Visual Controls** for troubleshooting

### Core Engine
- **AssetLoader** for robust image loading
- **GameEngine.init()** accepts direct data objects
- **Proper scaling** for tileset dimensions
- **Console logging** for debugging
- **Error handling** with fallback assets

### API Endpoints
- `GET /api/projects/[projectId]/preview` - Returns complete game data
- `GET /api/tilesets` - Returns available tilesets

### Default Behaviors
- New maps created with default "Layer 1"
- Maps assigned default tileset (ts1)
- Empty tiles represented as -1 in layer data
- Canvas has 2x scaling for retro feel

## Success Criteria
- ✅ Click Play button opens preview immediately
- ✅ Game renders with correct tileset and dimensions
- ✅ Pause/Resume controls work correctly
- ✅ Stop button closes preview cleanly
- ✅ Debug panel shows accurate information
- ✅ Tileset load failures show clear error messages
- ✅ Visual debugging tools help diagnose issues
- ✅ E2E tests validate complete preview flow
