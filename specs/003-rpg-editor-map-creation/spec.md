# Feature: Map Creation & Editing

## Goal
Enhance the RPG Editor to provide a robust map creation experience. Users should be able to configure map dimensions, select tilesets, manage layers, and paint tiles onto the map using a visual palette.

## User Stories
- As a game designer, I want to change the dimensions (width and height) of my map so that I can create maps of various sizes.
- As a game designer, I want to select a tileset for my map so that I can use specific visual assets.
- As a game designer, I want to see a palette of tiles from the selected tileset and select one to paint with.
- As a game designer, I want to select which layer I am painting on so that I can create depth (e.g., ground vs. objects).
- As a game designer, I want to save my changes to the map.

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

### Layer Management
- List available layers.
- Select the "Active Layer" for painting.
- (Optional for MVP) Add/Delete/Rename layers.

### Canvas Editor
- Render the map using the selected tileset.
- Render all layers in order.
- On click/drag, paint the selected tile onto the active layer at the mouse position.
- Show a grid overlay (toggleable?).

## Technical Considerations
- Reuse `@packages/types` for data structures.
- Ensure `MapRenderer` logic in `@packages/core` is compatible or reproducible in the editor for preview.
- Use `Canvas API` for the editor surface.
