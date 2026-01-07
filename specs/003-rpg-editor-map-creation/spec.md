# Feature: Map Creation & Editing

## Goal
Enhance the RPG Editor to provide a robust map creation experience. Users should be able to configure map dimensions, select tilesets, manage layers, and paint tiles onto the map using a visual palette.

## User Stories

### Core Features
- As a game designer, I want to change the dimensions (width and height) of my map so that I can create maps of various sizes.
- As a game designer, I want to select a tileset for my map so that I can use specific visual assets.
- As a game designer, I want to see a palette of tiles from the selected tileset and select one to paint with.
- As a game designer, I want to select which layer I am painting on so that I can create depth (e.g., ground vs. objects).
- As a game designer, I want to save my changes to the map.

### Zoom Controls (Enhancement)
- As a game designer, I want to zoom in and out of the map canvas so that I can work on fine details or see the overall layout.
- As a game designer, I want to quickly reset zoom to 100% so that I can return to the default view.
- As a game designer, I want to zoom the tile palette independently so that I can select small tiles more easily.
- As a game designer, I want to use keyboard shortcuts for zoom so that I can work more efficiently.

## Requirements

### Map Properties
- Input fields for Map Width and Map Height.
- Changing dimensions should preserve existing data where possible (cropping or extending).

### Tileset Selection
- Dropdown or selector to choose a Tileset.
- The map data should store the `tilesetId`.

### Tile Palette
- Display the full tileset image grid.
- Allow selecting a single tile (or potentially a region, but single tile for MVP).
- Highlight the currently selected tile.
- **Zoom controls** (50%, 100%, 200%, 300%, 400%)
- **Reset zoom button** for quick return to 100%

### Layer Management
- List available layers.
- Select the "Active Layer" for painting.
- (Optional for MVP) Add/Delete/Rename layers.

### Canvas Editor
- Render the map using the selected tileset.
- Render all layers in order.
- On click/drag, paint the selected tile onto the active layer at the mouse position.
- Show a grid overlay (toggleable?).
- **Zoom controls** (50%, 100%, 200%, 300%, 400%)
  - Zoom slider
  - Zoom in/out buttons
  - **Reset zoom button (⟲)**
  - Zoom percentage display
  - Keyboard shortcuts: `+`/`-` for zoom, `0` for reset

### Zoom Levels
- **50%** → 16px per tile (overview)
- **100%** → 32px per tile (default)
- **200%** → 64px per tile
- **300%** → 96px per tile
- **400%** → 128px per tile (detail work)

## Technical Considerations
- Reuse `@packages/types` for data structures.
- Ensure `MapRenderer` logic in `@packages/core` is compatible or reproducible in the editor for preview.
- Use `Canvas API` for the editor surface.
- Base tile size: 32px (industry standard)
- Independent zoom state for map canvas and tile palette
- Pixel-perfect rendering at all zoom levels (no anti-aliasing)
- Grid overlay must scale with zoom
