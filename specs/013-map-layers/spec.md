# Feature Specification: Map Layers

**Feature Branch**: `013-map-layers`
**Created**: 2026-09-11
**Status**: Approved
**Input**: Allow users to create, select, rename, delete, reorder, and hide multiple tile layers in the unified map editor. All tile layers remain below entities.

## User Scenarios & Testing

### User Story 1 - Paint independent layers (Priority: P1)

As a game creator, I can add and select tile layers so that I can paint overlapping parts of a map independently.

**Why this priority**: Independent painting is the core value of map layers.

**Independent Test**: Create a second layer, paint one tile on each layer at the same coordinate, switch between them, save, and confirm both tile values remain independent.

**Acceptance Scenarios**:

1. **Given** a map with one layer, **When** the user adds a layer, **Then** a new empty layer is selected above the existing layer.
2. **Given** two layers, **When** the user paints on the selected layer, **Then** only that layer's tile data changes.
3. **Given** edited layers, **When** the map is saved and reopened, **Then** all layers and their tile data are restored.

---

### User Story 2 - Organize layers (Priority: P2)

As a game creator, I can rename, reorder, and remove layers so that the map structure and visual stacking match my intent.

**Why this priority**: Organization makes multi-layer maps understandable and controls which tiles overlap.

**Independent Test**: Rename two layers, move the lower layer above the other, verify the visual order changes, then delete one while retaining a valid active layer.

**Acceptance Scenarios**:

1. **Given** multiple layers, **When** one is renamed, **Then** the new non-empty name is shown and persisted.
2. **Given** overlapping non-empty layers, **When** their order changes, **Then** the upper layer is rendered last while the same logical layer remains selected.
3. **Given** two or more layers, **When** one is deleted, **Then** its data is removed and a valid remaining layer is selected.
4. **Given** only one layer, **When** the user views its actions, **Then** deletion is unavailable.

---

### User Story 3 - Control layer visibility (Priority: P3)

As a game creator, I can hide and reveal tile layers so that I can inspect overlapping map content without deleting it.

**Why this priority**: Visibility improves editing complex maps without changing their content.

**Independent Test**: Hide a non-empty layer, verify its tiles disappear while its data remains intact, save and reopen the map, then reveal it again.

**Acceptance Scenarios**:

1. **Given** a visible non-empty layer, **When** the user hides it, **Then** its tiles are omitted from the editor and preview rendering.
2. **Given** a hidden layer, **When** the user reveals it, **Then** its tiles render again unchanged.
3. **Given** a map saved before visibility existed, **When** it is opened, **Then** all existing layers are visible.

### Edge Cases

- A map always retains at least one layer.
- Changing maps never leaves the active layer index outside the new map's layer range.
- Reordering the active layer keeps that same layer active at its new index.
- Deleting a layer before or at the active index selects a valid neighboring layer.
- Resizing a map preserves in-bounds tile data independently on every layer and initializes new cells as empty.
- Empty or whitespace-only names are rejected without losing the previous name.
- Hidden layers retain their tile data and can remain selected.

## Requirements

### Functional Requirements

- **FR-001**: The editor MUST create maps with one visible, empty tile layer.
- **FR-002**: Users MUST be able to create an empty layer above all existing tile layers.
- **FR-003**: Users MUST be able to select exactly one active layer for painting.
- **FR-004**: Painting MUST modify only the active layer.
- **FR-005**: Users MUST be able to rename a layer to a non-empty name.
- **FR-006**: Users MUST be able to move a layer one position up or down.
- **FR-007**: Users MUST be able to remove a layer when at least two layers exist.
- **FR-008**: Users MUST be able to hide and reveal each tile layer without changing its tile data.
- **FR-009**: Tile layers MUST render from the lowest array position to the highest, followed by map entities.
- **FR-010**: Layer order, names, visibility, and tile data MUST persist when the map is saved.
- **FR-011**: Existing layers without an explicit visibility value MUST remain visible.
- **FR-012**: Resizing a map MUST resize every layer while preserving all tile data that remains within bounds.
- **FR-013**: Layer operations MUST mark the map as having unsaved changes.
- **FR-014**: Selecting a different map MUST select a valid layer in that map.

### Key Entities

- **Map**: A tile grid with dimensions, a tileset, an ordered non-empty collection of tile layers, and optional entities.
- **Layer**: A named tile grid belonging to a map, with a persistent visibility state and position in the rendering order.
- **Active Layer**: The single layer currently targeted by editing actions; this is editor session state rather than persisted map data.

## Assumptions

- All tile layers use the map's tileset.
- Hidden layers remain editable if selected; visibility controls rendering only.
- Reordering uses explicit move-up and move-down actions rather than drag and drop.
- Tile layers remain below all entities; foreground and collision-specific layers are outside this feature.
- The highest layer is displayed first in the layer panel, matching common visual-editor conventions.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can create a second layer and begin painting on it in at most three interactions.
- **SC-002**: Switching layers and painting never changes tile data in an unselected layer across all automated scenarios.
- **SC-003**: A saved map restores 100% of its layer names, order, visibility values, and in-bounds tile data.
- **SC-004**: Existing maps open with no visible rendering difference before the user changes layer settings.
- **SC-005**: Every create, select, rename, reorder, hide, reveal, and permitted delete action completes without leaving the editor in an invalid layer state.
