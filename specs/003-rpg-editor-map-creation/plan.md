# Implementation Plan - Map Creation

## Phase 1: Backend & Types
1.  **Tileset API**: Create an API route to list available tilesets.
    *   `GET /api/tilesets`
2.  **Map Data Update**: Ensure `Map` interface in `@packages/types` supports `tilesetId`. (Check existing types).

## Phase 2: Editor UI - Map Properties & Tileset
1.  **Map Properties Component**: Create a component to edit Width, Height, and Tileset.
2.  **State Management**: Update `MapEditor` to manage these new properties.
3.  **Resize Logic**: Implement logic to resize the `data` arrays when dimensions change.

## Phase 3: Tile Palette
1.  **Tileset Loading**: Load the selected tileset image in `MapEditor`.
2.  **Palette Component**: Update `TilePalette` to render the tileset image.
    *   Handle slicing/grid display.
    *   Allow selection of a tile index.

## Phase 4: Layer Management
1.  **Layer UI**: Add a control to select the active layer.
2.  **Layer Data**: Ensure map data has at least one layer. Support adding new layers if needed (or just fixed set for now).

## Phase 5: Canvas Rendering & Painting
1.  **Rendering**: Update the canvas drawing logic to use the selected tileset image and render all layers.
    *   Consider using `MapRenderer` from `@packages/core` if possible, or duplicate logic for React context.
2.  **Painting**: Update mouse event handlers to write to the *active layer* using the *selected tile*.

## Phase 6: Saving
1.  **Save API**: Ensure the `PUT` endpoint handles the updated map structure (dimensions, tilesetId, layers).
