# Research: Editor Canvas Viewport

## 1. Viewing area size vs zoom

**Decision**: Size the map `<canvas>` (and overlay canvases) to the center workspace in CSS pixels. Zoom is a camera scale applied inside the 2D context. Do not change the element’s layout size when zoom changes.

**Rationale**: Today `MapCanvas` hardcodes `width={800} height={600}` while `GameEngine` applies `ctx.scale(zoom)`. Tiles grow, the window does not. Filling the workspace and scaling the world matches the spec and common map-editor cameras.

**Alternatives considered**:
- Grow the canvas backing store with zoom (map pixels × zoom). Rejected: the window would grow with zoom and hide the workspace.
- CSS `transform: scale` on a map-sized canvas. Rejected: blurs pixel art, fights overlay alignment, and still needs a clip/viewport.
- Keep 800×600 and only add pan. Rejected: does not fix the cramped window.

## 2. Pan as camera translate, not CSS translate

**Decision**: Apply pan as the camera’s translation in the same `setTransform` as zoom. Remove the CSS `translate(offsetX, offsetY)` on the canvas elements.

**Rationale**: CSS pan moves the entire 800×600 box around the workspace. Once the canvas fills the workspace, CSS pan would slide the viewing window off-screen. A camera transform keeps the window fixed and moves the map under it. Hit-testing then uses one formula: `world = (screen - offset) / zoom`.

**Alternatives considered**:
- Keep CSS pan on a full-size canvas. Rejected: the viewing area would leave the workspace.
- Scroll the container. Rejected: fights overlay canvases, painting, and pixel-art alignment.

## 3. Engine camera vs recreating GameEngine on zoom

**Decision**: Add `GameEngine.setCamera({ zoom, offsetX, offsetY })` and `setCanvasSize(width, height)`. Each frame: identity transform, clear the full buffer, then `setTransform(zoom, 0, 0, zoom, offsetX, offsetY)`. Stop recreating the engine when zoom changes. Player keeps constructor `scale` as the camera zoom with zero offset.

**Rationale**: Recreating the engine on every zoom is slow and loses live map edits. `Renderer.clear()` currently uses construction-time width/height under a leftover scale, which is incorrect after resize. Per-frame identity clear is the standard Canvas 2D camera pattern.

**Alternatives considered**:
- Editor-only CSS/camera with no core change. Rejected: overlays and the engine would drift; constitution prefers native canvas in core.
- Pixi/Phaser camera. Rejected: Principle IV.

## 4. Resize

**Decision**: `ResizeObserver` on the canvas container. Write `canvas.width/height` to the observed CSS size (1:1 CSS pixel = 1 canvas pixel). Do not use `devicePixelRatio` for this feature (pixel-art nearest-neighbor). Do not reset zoom or pan on resize.

**Rationale**: Matches FR-001–FR-003. Ignoring DPR avoids muddy tiles and mismatched overlay sizes.

**Alternatives considered**: HiDPI backing store. Deferred; would need matching overlay and hit-test scale.

## 5. Types

**Decision**: Add a session-only `ViewportCamera` in `packages/types` (`zoom`, `offsetX`, `offsetY`). Not persisted. Editor zoom steps stay in `viewportStore` as the existing discrete list.

**Rationale**: Principle I — shared camera shape for store, engine, overlays, and tests. Not game save data.

**Alternatives considered**: Zustand-only numbers. Weaker sharing with core. Mongo fields. Spec forbids persisting viewport.

## 6. Secondary-button pan vs entity menu

**Decision**: On secondary `pointerdown`, record the point and do not open the menu yet. If pointer travel exceeds 4 CSS pixels, enter pan and suppress the next `contextmenu`. If `pointerup` with travel below threshold, treat as a click: open the existing entity menu when an entity is under the pointer; otherwise do nothing (no browser menu).

**Rationale**: Spec requires both gestures. Preventing every `contextmenu` would kill the entity menu.

**Alternatives considered**: Menu on `contextmenu` always, pan only with middle/Space. Rejected: misses FR-008. Always pan on right button, menu on long-press. Worse discoverability.

## 7. Two-finger trackpad pan

**Decision**: Listen to `wheel` on the viewing area with `{ passive: false }`. Apply `offset += (-deltaX, -deltaY)` (natural trackpad direction). Ignore `ctrlKey` / pinch-zoom (`ctrlKey` + wheel on some platforms). Do not change zoom from the wheel.

**Rationale**: macOS two-finger move is exposed as `wheel` with `deltaX`/`deltaY`. Spec out of scopes wheel zoom.

**Alternatives considered**: Pointer Events `pointerType === 'touch'` two-pointer gesture. Extra complexity; trackpads already send wheel. `overflow: scroll`. Conflicts with camera.

## 8. Existing pan and shortcuts

**Decision**: Keep arrow keys, middle-button drag, Space + primary drag, `+`/`-`/`0`/`Home` as they work today, but route them through the same camera store. Ignore arrows when typing or when a dialog has focus.

**Rationale**: FR-005–FR-007, FR-011.

## 9. Overlays and hit testing

**Decision**: Overlay canvases use the same buffer size and the same camera transform as the map canvas. `screenToTileCoords` uses the unified world formula. Overlay draw code must include pan, not only `scale(zoom)`.

**Rationale**: FR-004 / SC-005. Today overlays scale but pan only via CSS; after removing CSS pan they would desync.

## 10. Player

**Decision**: No player UX change. Constructor `scale` remains the player camera zoom. Do not fill the player canvas from the editor workspace.

**Rationale**: Principle III.
