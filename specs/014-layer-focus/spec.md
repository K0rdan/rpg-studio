# Feature Specification: Layer Focus Aids

**Feature Branch**: `014-layer-focus`
**Created**: 2026-09-11
**Status**: Draft
**Input**: In the unified map editor, help users compose tile layers by dimming inactive layers on selection, isolating a layer temporarily, and showing empty cells of the active layer. These aids are editor-session only and must not change saved maps, preview, or player rendering.

## User Scenarios & Testing

### User Story 1 - Focus the selected layer (Priority: P1)

As a game creator, I select a tile layer and immediately see that layer at full strength while other visible layers recede, so I can paint overlapping decoration without losing alignment to the rest of the map.

**Why this priority**: Distinguishing the active layer on the canvas is the main composition problem once multiple layers exist.

**Independent Test**: Open a map with two overlapping visible layers, select each in turn, and confirm only the selected layer stays fully vivid while the other remains visible but subdued. Save, preview, and reopen: saved tiles and preview appearance are unchanged.

**Acceptance Scenarios**:

1. **Given** a map with two or more visible layers, **When** the user selects a layer, **Then** that layer is drawn at full strength and every other currently visible layer is drawn subdued.
2. **Given** a subdued inactive layer, **When** the user paints on the selected layer, **Then** only the selected layer changes and alignment with the subdued tiles remains possible.
3. **Given** a map with only one visible layer, **When** that layer is selected, **Then** the canvas is not subdued.
4. **Given** focus is active in the editor, **When** the user opens preview or plays the project, **Then** all visible layers appear at full strength in their true colors.

---

### User Story 2 - Isolate a layer temporarily (Priority: P2)

As a game creator, I can temporarily show only one tile layer so I can inspect its contents without deleting or permanently hiding the others.

**Why this priority**: Isolation is needed when dimming is not enough (dense overlapping tiles), but it should stay an explicit, reversible action.

**Independent Test**: Isolate a middle layer, confirm other tile layers disappear while entities remain, exit isolate, and confirm previous visibility and focus dimming return. Persistence and preview stay unaffected.

**Acceptance Scenarios**:

1. **Given** several visible layers, **When** the user isolates a layer, **Then** only that tile layer is drawn and the layer list makes the isolated state obvious.
2. **Given** isolate is on, **When** the user selects a different layer, **Then** isolate follows the newly selected layer (only that layer is shown).
3. **Given** isolate is on, **When** the user exits isolate, **Then** previously visible layers reappear and focus dimming applies again.
4. **Given** a layer that was already hidden, **When** isolate ends, **Then** that layer remains hidden.

---

### User Story 3 - See empty cells of the active layer (Priority: P3)

As a game creator, I can tell which cells of the *active* layer are empty even when a tile from another layer occupies the same coordinate.

**Why this priority**: Focus dimming shows which layer is on top visually; it does not tell whether the active layer already has a tile at that cell.

**Independent Test**: Paint a ground tile on layer 0, select an empty overlay layer, and confirm the occupied ground cell still shows as empty on the overlay. Paint that cell on the overlay and confirm the empty marker disappears for that cell only.

**Acceptance Scenarios**:

1. **Given** an active visible layer, **When** a cell has no tile on that layer, **Then** the editor shows a discreet empty-cell marker at that coordinate.
2. **Given** an empty-cell marker, **When** the user paints a tile there on the active layer, **Then** the marker for that cell disappears.
3. **Given** isolate or a single visible layer, **When** empty-cell aids are on, **Then** markers still reflect only the active layer's empty cells.
4. **Given** preview or player, **When** the map is shown, **Then** empty-cell markers are not drawn.

### Edge Cases

- Hidden layers never appear in focus or isolate rendering.
- If the active layer is hidden, painting still targets it; the canvas shows other visible layers in focus/isolate according to remaining visible layers, and empty-cell markers are not shown for a hidden active layer.
- Switching maps resets isolate and reapplies focus to the new map's active layer.
- Deleting or reordering layers keeps isolate and focus bound to the same logical active layer.
- Entities always draw at full strength above tile layers in the editor, including during isolate.
- Focus, isolate, and empty-cell markers never write to saved layer data (names, order, visibility, tiles).
- An isolated hidden layer becomes the only tile layer shown until isolate ends; exiting isolate restores its hidden state.

## Requirements

### Functional Requirements

- **FR-001**: When two or more tile layers are visible, the editor MUST draw the selected visible layer at full strength and draw other visible tile layers subdued.
- **FR-002**: Subdued layers MUST remain spatially aligned and readable enough to place tiles against them.
- **FR-003**: A map with fewer than two visible tile layers MUST NOT apply subduing.
- **FR-004**: Users MUST be able to enter and exit an isolate mode that shows only the active tile layer.
- **FR-005**: Isolate MUST follow the active layer when the selection changes.
- **FR-006**: Exiting isolate MUST restore each layer's previous shown/hidden state.
- **FR-007**: The layer list MUST indicate which layer is focused and whether isolate is active.
- **FR-008**: The editor MUST mark empty cells of the active visible layer without using another layer's tiles as occupancy.
- **FR-009**: Empty-cell markers MUST update immediately as the user paints or erases on the active layer.
- **FR-010**: Focus, isolate, and empty-cell markers MUST NOT persist on save and MUST NOT appear in preview or the player.
- **FR-011**: Persistent layer visibility (hide/show) remains independent of focus dimming.
- **FR-012**: Entities MUST remain fully visible above tiles during focus and isolate.

### Key Entities

- **Active Layer**: The layer currently targeted by painting; already session state from map-layer management.
- **Layer Focus**: Editor-only presentation of visible inactive layers as subdued relative to the active layer.
- **Layer Isolate**: Editor-only mode that temporarily shows a single tile layer without changing stored visibility.
- **Empty-Cell Marker**: Editor-only overlay indicating that the active layer has no tile at a coordinate.

## Assumptions

- This feature builds on existing multi-layer editing (create, select, hide, reorder).
- Default subduing is a strong dim plus slight desaturation; inactive layers stay visible (approximately a quarter of full strength).
- Isolate is triggered from the layer row (modifier-click on the visibility control, with an equivalent button/tooltip for discoverability).
- Empty-cell markers are a light overlay (small dot or faint cell hint), not a heavy checkerboard that hides the map.
- Empty-cell markers can be shown whenever a map is being edited; they do not need a separate user preference in this version.
- Layer thumbnails in the list are out of scope and may follow later.
- No new persisted layer fields (opacity, lock, tint) are introduced.

## Success Criteria

### Measurable Outcomes

- **SC-001**: After selecting a different layer on a multi-layer map, a user can tell which layer is active from the canvas alone within one glance (no need to re-read the list).
- **SC-002**: Users can align a tile on an overlay layer to a subdued ground tile without hiding the ground layer.
- **SC-003**: Isolate and exit isolate each complete in one explicit action and restore the previous visibility setup 100% of the time.
- **SC-004**: Saved maps, preview, and playthrough show 0% of focus dimming, isolate hiding, or empty-cell markers.
- **SC-005**: For any coordinate, the empty-cell marker is present if and only if the active visible layer has no tile there.
