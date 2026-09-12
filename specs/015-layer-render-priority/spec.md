# Feature Specification: Layer Render Priority

**Feature Branch**: `015-layer-render-priority`
**Created**: 2026-09-11
**Status**: Approved
**Input**: Allow the player to move visually in front of or behind map scenery.

## User Scenarios & Testing

### User Story 1 - Place scenery around characters (Priority: P1)

As a game creator, I can classify a tile layer as below, at the same depth as,
or above characters so that scenery overlaps characters naturally.

**Why this priority**: This is the core visual behavior.

**Independent Test**: Place scenery on each priority and move the player around
it; ground stays below, foreground stays above, and same-depth scenery changes
overlap according to vertical position.

**Acceptance Scenarios**:

1. **Given** a below layer, **When** the player crosses its tiles, **Then** the player is always drawn above them.
2. **Given** an above layer, **When** the player crosses its tiles, **Then** its tiles are always drawn above the player.
3. **Given** same-depth scenery, **When** the player's feet are north of it, **Then** the scenery is drawn in front of the player.
4. **Given** same-depth scenery, **When** the player's feet are south of it, **Then** the player is drawn in front of the scenery.

---

### User Story 2 - Configure priority in the editor (Priority: P2)

As a game creator, I can choose the render priority of each layer and save it.

**Independent Test**: Change a layer priority, save and reopen the map, and
confirm both the selected value and preview overlap remain unchanged.

**Acceptance Scenarios**:

1. **Given** a selected layer, **When** its priority changes, **Then** the map is marked unsaved and the canvas updates immediately.
2. **Given** a saved priority, **When** the map is reopened or previewed, **Then** the same priority is used.

---

### User Story 3 - Preserve existing maps (Priority: P3)

As a game creator, I can open an older map without its appearance changing.

**Independent Test**: Open a map whose layers have no priority and verify that
every tile remains below characters.

**Acceptance Scenarios**:

1. **Given** a legacy layer with no priority, **When** it renders, **Then** it behaves as a below layer.

### Edge Cases

- Hidden layers remain hidden regardless of priority.
- Reordering layers changes order only among tiles with the same priority.
- Multiple same-depth layers preserve their array order for equal positions.
- A character and same-depth tile at an equal foot position use a deterministic order.
- Maps without a player still render every visible priority.

## Requirements

### Functional Requirements

- **FR-001**: Every map layer MUST support below, same-depth, and above render priorities.
- **FR-002**: Missing priority values MUST behave as below.
- **FR-003**: Visible below layers MUST render before characters.
- **FR-004**: Visible above layers MUST render after characters.
- **FR-005**: Same-depth tiles and characters MUST be ordered by their bottom vertical coordinate.
- **FR-006**: Equal same-depth positions MUST render deterministically.
- **FR-007**: Layer visibility and editor focus behavior MUST continue to apply at every priority.
- **FR-008**: Users MUST be able to change a layer priority in the layer panel.
- **FR-009**: Priority changes MUST persist and mark the map as unsaved.
- **FR-010**: Non-player map entities MUST participate in the same vertical ordering as the player.

### Key Entities

- **Layer**: A tile grid with a render priority in addition to name, visibility, and tile data.
- **Render priority**: One of below, same-depth, or above.
- **Depth item**: A same-depth tile row or character ordered using its bottom vertical coordinate.

## Assumptions

- Priority controls visual composition only; collision remains a separate concern.
- Character feet are the bottom edge of their destination tile-sized frame.
- At equal depth, map tiles render before characters so a character remains readable.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All three priority modes produce the expected overlap in 100% of automated rendering scenarios.
- **SC-002**: Existing maps retain their previous visual stacking without migration.
- **SC-003**: A creator can change a layer priority in at most two interactions.
- **SC-004**: Saved priorities are restored in 100% of persistence scenarios.
