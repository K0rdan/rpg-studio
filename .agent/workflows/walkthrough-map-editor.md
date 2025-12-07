# Walkthrough: Map Editor Features

## Prerequisites
- Ensure `npm run dev` is running in `apps/editor`.
- Ensure MongoDB is running.

## Steps

1.  **Open Editor**: Navigate to `http://localhost:3000`.
2.  **Open Project**: Click on an existing project or create a new one.
3.  **Create Map**:
    - Click "New Map".
    - Enter Name "Test Map", Width 10, Height 10.
    - Click "Create".
    - You should be redirected to the map editor.

4.  **Verify Map Properties**:
    - Locate the "Map Properties" section at the top.
    - Change **Width** to `15`. Verify the grid on the canvas expands.
    - Change **Height** to `15`. Verify the grid expands vertically.
    - In **Tileset** dropdown, select "Fixed Tileset" (if not already selected).
    - Verify the **Palette** (left side) displays the tileset image.

5.  **Verify Palette & Painting**:
    - **Single Tile**: Click on a single tile in the **Palette**. A red selection box should appear. Paint on the canvas.
    - **Multi-Tile**: Click and drag in the **Palette** to select a 2x2 area (or larger).
    - Paint on the canvas. Verify the entire 2x2 block is painted at once.

6.  **Verify Zoom**:
    - Locate the Zoom controls (top right, near Save button).
    - Click **+** to zoom in. Verify the map gets larger.
    - Click **-** to zoom out. Verify the map gets smaller.
    - Try painting while zoomed in/out to ensure mouse coordinates are correct.

7.  **Verify Layer Management**:
    - Locate the **Layers** section (now above the Palette).
    - You should see "Layer 1".
    - Click the **+** (Add) button. "Layer 2" should appear.
    - Select a different tile/region from the Palette.
    - Paint on the canvas. This is now on Layer 2.
    - Select "Layer 1" in the list.
    - Paint a different tile. This is on Layer 1.
    - (Optional) Click the Trash icon on "Layer 2" to delete it.

8.  **Save & Reload**:
    - Click **Save Map**.
    - Wait for "Map saved!" toast.
    - Refresh the page.
    - Verify the map dimensions, tileset, layers, and painted tiles are restored correctly.
