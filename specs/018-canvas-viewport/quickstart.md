# Quickstart: Verify Canvas Viewport

1. Open `/projects/{projectId}/editor` on a map with several tiles painted.
2. Confirm the map viewing area fills the center workspace (not a small fixed rectangle).
3. Zoom in with the on-screen control or `+`: tiles grow; the viewing area size stays the workspace size; some of the map may leave the window.
4. Resize the inspector or explorer: the viewing area follows; zoom stays the same.
5. Pan with arrows, middle-button drag, and Space + left drag until a previously hidden cell is visible.
6. Secondary-drag (right mouse) to pan; confirm no entity menu appears.
7. Two-finger trackpad swipe (or a horizontal/vertical wheel) over the map: the map pans, zoom does not change.
8. Secondary-click an entity without moving: the delete menu still opens.
9. Paint a tile at the visible cell under the pointer; it matches that cell at the current zoom and pan.
10. Press `0` then `Home`: zoom returns to 1×; `Home` also recenters.
11. Save and open preview: map data and size are unchanged; preview is not panned to the editor camera.

## Automated validation

```bash
npm run test --workspace @packages/core -- Renderer.test.ts
npm run test --workspace @packages/core -- GameEngine
npm run test --workspace @apps/editor -- --runInBand src/lib/canvasCamera.test.ts
npx tsc --noEmit -p packages/core/tsconfig.json
npx tsc --noEmit -p apps/editor/tsconfig.json
```

Run the unified-editor Cypress scenario for fill, zoom-without-grow, pan gestures, and entity context menu after unit checks pass.
