# Feature Specification: Editor Canvas Viewport

**Feature Branch**: `018-canvas-viewport`  
**Created**: 2026-09-13  
**Status**: Draft  
**Input**: User description: "When zooming in the editor, tiles grow but the map viewing window stays a small fixed size. The viewing window should fill the workspace. Zoom must enlarge the map inside that window, not grow the window. Pan already works with arrow keys and should stay. Extend pan with secondary-button drag (Windows) and two-finger trackpad movement (Mac)."

## User Scenarios & Testing

### User Story 1 - Fill the workspace and zoom the map, not the window (Priority: P1)

As a game creator, I see the map in a viewing area that uses the full center workspace. When I zoom in or out, tiles change size inside that area while the viewing window itself stays the size of the workspace (including after I resize panels or the application window).

**Why this priority**: A cramped, fixed viewing window is the blocking problem; pan only matters once the map is actually visible at usable size.

**Independent Test**: Open a map, confirm the viewing area fills the center workspace, zoom through several levels, resize a side panel, and confirm tiles scale while the window still fills the remaining center space.

**Acceptance Scenarios**:

1. **Given** a map is open in the editor, **When** the creator looks at the center workspace, **Then** the map viewing area occupies that workspace rather than a small fixed rectangle in the middle.
2. **Given** a map at default zoom, **When** the creator zooms in, **Then** tiles appear larger and more of the map may fall outside the window, but the viewing window size still matches the center workspace.
3. **Given** a map zoomed in, **When** the creator zooms out, **Then** tiles appear smaller and more of the map can fit, without shrinking the viewing window below the workspace.
4. **Given** any zoom level, **When** the creator resizes a side panel or the application window, **Then** the viewing window follows the new center workspace size at the same zoom.
5. **Given** the map is zoomed, **When** the creator paints a tile, places or selects an entity, or inspects overlays (empty cells, collision), **Then** those actions still line up with the visible tiles.

---

### User Story 2 - Keep keyboard and existing pointer pan (Priority: P2)

As a game creator, I can move the map under the viewing window with arrow keys, middle-button drag, and Space plus left-button drag, so a zoomed map remains reachable without changing zoom.

**Why this priority**: Pan is already useful and documented for the layout; it must keep working once the viewing window fills the workspace.

**Independent Test**: Zoom in until part of the map is off-screen, pan with arrows, middle-button drag, and Space+drag, then reset the view and confirm the map returns to a known origin.

**Acceptance Scenarios**:

1. **Given** a zoomed map with parts off-screen, **When** the creator uses the arrow keys, **Then** the map moves in the expected direction inside the viewing window.
2. **Given** the pointer is over the map viewing area, **When** the creator drags with the middle button, **Then** the map follows the pointer.
3. **Given** Space is held, **When** the creator drags with the primary (left) button, **Then** the map pans and painting or entity placement does not start.
4. **Given** a panned and zoomed view, **When** the creator resets zoom or resets the view with the existing shortcuts, **Then** zoom and/or position return to the default origin as those shortcuts already do.
5. **Given** the creator is typing in a name or other text field, **When** they press arrow keys, **Then** those keys edit or move the caret and do not pan the map.

---

### User Story 3 - Pan with secondary drag and two-finger movement (Priority: P3)

As a game creator, I can pan by dragging with the secondary mouse button (typical on Windows) and by moving two fingers on a trackpad (typical on Mac), without losing the entity context menu on a simple secondary click.

**Why this priority**: Pointer pan is the practical companion to a large zoomed view, but it must not replace the existing entity delete menu.

**Independent Test**: Zoom in, pan with secondary-button drag and with two-finger trackpad movement, then secondary-click an entity without dragging and confirm the existing delete menu still appears.

**Acceptance Scenarios**:

1. **Given** the pointer is over the map viewing area, **When** the creator presses the secondary button and drags, **Then** the map pans with the pointer and the entity context menu does not open.
2. **Given** a Mac-style trackpad (or equivalent two-finger scroll surface) over the map viewing area, **When** the creator moves two fingers, **Then** the map pans in the corresponding direction.
3. **Given** an entity under the pointer, **When** the creator secondary-clicks without dragging, **Then** the existing entity context menu still opens and the map does not pan.
4. **Given** empty map space under the pointer, **When** the creator secondary-clicks without dragging, **Then** no new menu appears and the map does not pan.
5. **Given** a two-finger tap that the system treats as a secondary click (not a continuous two-finger move), **When** an entity is under the pointer, **Then** the entity context menu opens as today.

---

### Edge Cases

- At default zoom, if the whole map already fits, pan still moves the map; there is no hard clamp required in this feature.
- Releasing a pan gesture outside the viewing area ends pan; the next primary click paints or selects as usual.
- Overlays (entities, empty-cell marks, collision highlight) stay locked to the same map cells as the tiles while zooming and panning.
- Zoom level changes do not jump the view to a random place; the map stays on the current pan offset unless the creator explicitly resets the view.
- Holding Space shows a grab affordance; releasing Space restores the normal pointer for the active tool.
- Arrow-key pan is ignored while a confirmation dialog or similar blocking overlay has focus.
- Very high zoom may show only a few tiles; pan remains the way to reach the rest of the map.
- Panel resize during an active pan updates the viewing window size without cancelling the pan offset.

## Requirements

### Functional Requirements

- **FR-001**: The map viewing area MUST fill the editor’s center workspace at every zoom level.
- **FR-002**: Changing zoom MUST scale the map (tiles, grid alignment, overlays) inside the viewing area and MUST NOT grow or shrink the viewing area itself.
- **FR-003**: Resizing the center workspace MUST resize the viewing area to match, without resetting zoom.
- **FR-004**: Painting, entity placement, entity selection, and overlay hit alignment MUST remain correct at every supported zoom and pan offset.
- **FR-005**: Users MUST be able to pan with the arrow keys when they are not typing in a text field.
- **FR-006**: Users MUST be able to pan by dragging with the middle pointer button.
- **FR-007**: Users MUST be able to pan by holding Space and dragging with the primary button, without starting a paint or entity action.
- **FR-008**: Users MUST be able to pan by dragging with the secondary pointer button.
- **FR-009**: Users MUST be able to pan by moving two fingers on a trackpad (or equivalent scroll/swipe) over the map viewing area.
- **FR-010**: A secondary click without a drag MUST still open the existing entity context menu when an entity is under the pointer.
- **FR-011**: Existing zoom in, zoom out, reset zoom, and reset view shortcuts MUST keep their current meaning.
- **FR-012**: Zoom and pan are editor viewing state only; they MUST NOT change saved map size, tile data, or exported game layout.

### Key Entities

- **Viewing area**: The map window in the center workspace; its size follows that workspace, not the zoom level.
- **Zoom**: How large map tiles appear inside the viewing area.
- **Pan offset**: How far the map is shifted under the viewing area.
- **Secondary click**: A non-dragging click with the secondary button (right mouse, or a trackpad secondary click), used for the entity context menu.

## Assumptions

- This feature extends the existing editor layout viewport (zoom steps, arrow pan, middle-button pan, Space+drag) described in `specs/009-rpg-editor-ui-layout`. It does not change panel layout, tools, or persistence of panel sizes.
- Zoom continues to use the existing discrete editor zoom steps and on-screen zoom controls.
- Viewport zoom and pan are session viewing aids and are not saved with the project.
- Mouse-wheel zoom and pinch-to-zoom are out of scope; two-finger movement pans only.
- A minimap is out of scope.
- Primary-button drag without Space continues to paint or place/select entities according to the active tool.
- Distinguishing a secondary click from a pan uses a small movement threshold: no meaningful pointer travel means “click” (menu if an entity is hit); travel means pan.
- Two-finger tap as a secondary click remains a click, not a pan; continuous two-finger movement pans.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In 100% of checked window and panel sizes, the map viewing area fills the center workspace (no leftover unused band around a smaller fixed map window).
- **SC-002**: After every zoom in or out, the viewing area size is unchanged aside from workspace resizes, while tile size on screen changes with the zoom step.
- **SC-003**: A creator can bring any off-screen map cell into the window using only pan (arrows, middle drag, Space+drag, secondary drag, or two-finger movement) without changing map data.
- **SC-004**: In 100% of tested cases, a secondary click without drag on an entity still opens the delete menu, and a secondary drag never opens that menu.
- **SC-005**: At every supported zoom and pan offset tested, a click on a visible tile affects that same map cell (paint or entity), including when overlays are visible.
