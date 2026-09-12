# Feature Specification: Terrain Collision

**Feature Branch**: `016-terrain-collision`
**Created**: 2026-09-12
**Status**: Draft
**Input**: Allow game creators to mark tileset tiles as blocking so the player cannot walk through walls and water on below layers, while same-depth and above scenery remain passable.

## User Scenarios & Testing

### User Story 1 - Block walking on solid ground tiles (Priority: P1)

As a game creator, I can mark tileset tiles as blocking and paint them on below layers so that the player cannot walk through walls, water, or other solid terrain.

**Why this priority**: Stop-the-player terrain is the core gameplay value after painting and layering tiles.

**Independent Test**: Mark a wall tile as blocking, paint a closed room on a below layer, preview, and confirm the player can walk on unmarked floor tiles but cannot enter the wall cells or leave the map.

**Acceptance Scenarios**:

1. **Given** a tileset tile marked as blocking and painted on a below layer, **When** the player tries to enter that cell, **Then** the player stays outside the cell.
2. **Given** a tileset tile that is not marked as blocking, **When** the player walks onto a below-layer cell painted with that tile, **Then** movement continues.
3. **Given** two below layers that both occupy the same cell, **When** any of those tiles is blocking, **Then** the cell cannot be entered.
4. **Given** a player at the edge of the map, **When** they try to move outside the map, **Then** movement is refused.
5. **Given** blocking marks on a tileset, **When** the tileset is saved and reopened, **Then** those marks are restored and still apply in preview and play.

---

### User Story 2 - Keep scenery walkable (Priority: P2)

As a game creator, I can place same-depth and above scenery without blocking the player, even when those tiles come from the same tileset as solid ground.

**Why this priority**: Visual overlap and movement blocking must stay independent so canopies, shadows, and same-depth props do not trap the player.

**Independent Test**: Paint a blocking wall tile on a below layer, the same tile on a same-depth layer, and a canopy on an above layer; walk through the same-depth and above cells while still being stopped by the below wall.

**Acceptance Scenarios**:

1. **Given** a blocking tileset tile painted only on a same-depth layer, **When** the player crosses that cell, **Then** movement is allowed and the existing overlap rules still apply.
2. **Given** a blocking tileset tile painted only on an above layer, **When** the player crosses that cell, **Then** movement is allowed and the scenery still draws in front of the player.
3. **Given** a blocking tile on a below layer and non-blocking decoration on same-depth or above at the same cell, **When** the player approaches, **Then** the cell remains blocked.
4. **Given** a cell that should look like a blocking same-depth object, **When** the creator paints a blocking tile on a below layer at that cell, **Then** the player is stopped while the same-depth art can still overlap by height.

---

### User Story 3 - Inspect and edit collision in the editor (Priority: P3)

As a game creator, I can see which tileset tiles are blocking and which map cells currently stop movement so that I can correct terrain without guessing.

**Why this priority**: Authoring and debugging are required to use the feature, but playable blocking already delivers value without the overlay.

**Independent Test**: Toggle a tileset tile between walkable and blocking, confirm the palette shows the new state, enable the map overlay, and verify highlighted cells match below-layer blocking tiles including stacked layers.

**Acceptance Scenarios**:

1. **Given** a selected tileset tile, **When** the creator toggles its blocking state, **Then** the new state is visible immediately and the tileset is marked unsaved.
2. **Given** a map with mixed walkable and blocking below tiles, **When** the collision overlay is shown, **Then** only cells that currently block movement are highlighted.
3. **Given** the overlay visible, **When** the creator paints, erases, hides a below layer, or changes a tileset tile's blocking state, **Then** the highlighted cells update to match the new blocking result.
4. **Given** an older tileset with no blocking marks, **When** it is opened, **Then** every tile is walkable and the player can still be confined only by the map edges.

### Edge Cases

- An empty cell on every participating layer is walkable.
- Erasing the last blocking below tile in a cell makes that cell walkable.
- Hidden layers do not render and do not contribute to collision.
- A missing blocking mark behaves as walkable.
- A below layer with no painted tiles does not block any cell by itself.
- When the player moves diagonally into a blocked corner, they continue along any unblocked axis instead of stopping completely.
- A character already standing in a cell that later becomes blocked (for example after painting under them) is not relocated; they are only prevented from entering newly blocked cells.
- Maps without a player still store and display collision marks; nothing walks.
- Blocking marks belong to the tileset: every map that uses that tileset shares them.

## Requirements

### Functional Requirements

- **FR-001**: Users MUST be able to mark each tileset tile as blocking or walkable.
- **FR-002**: Missing blocking marks MUST behave as walkable.
- **FR-003**: A map cell MUST block movement when at least one visible below layer has a blocking tile in that cell.
- **FR-004**: Same-depth and above layers MUST NOT contribute to terrain collision.
- **FR-005**: Hidden layers MUST NOT contribute to terrain collision.
- **FR-006**: Cells outside the map MUST block movement.
- **FR-007**: Walkable cells MUST allow the player to enter them during preview and play.
- **FR-008**: Diagonal movement MUST slide along an unblocked axis when the other axis is blocked.
- **FR-009**: Render priority MUST continue to control overlap only; it MUST NOT otherwise change collision beyond which layers participate.
- **FR-010**: Blocking marks MUST persist with the tileset and apply to every map that uses it.
- **FR-011**: Users MUST be able to show or hide a map overlay of cells that currently block movement.
- **FR-012**: The overlay and blocking marks MUST update immediately when tileset marks, painted tiles, layer visibility, or layer priority change.
- **FR-013**: Tileset blocking changes MUST mark the tileset as having unsaved changes.
- **FR-014**: Existing maps and tilesets MUST remain fully walkable inside their bounds until a creator marks tiles as blocking.

### Key Entities

- **Tileset tile**: A reusable tile with an optional blocking mark shared by every map that uses the tileset.
- **Blocking cell**: A map coordinate that the player cannot enter, derived from visible below-layer tiles and map bounds.
- **Collision overlay**: An editor-only view of blocking cells on the current map.
- **Participating layer**: A visible layer whose render priority is below; only these layers feed terrain collision.

## Assumptions

- Collision is authored on tileset tiles, not on a dedicated collision layer and not per map cell.
- Same-depth objects that must also block (for example a fence) are achieved by painting a blocking tile on a below layer at the same cell.
- The player occupies one map cell; entity-to-entity collision, pixel-perfect hitboxes, and directional passage (block from one side only) are out of scope.
- A layer-level “participates in collision” override is out of scope; participation follows visible below layers only.
- Editor preview and play use the same blocking rules.
- Non-player characters do not move in this feature, so only the player is tested against terrain.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In 100% of automated movement scenarios, the player cannot enter a blocking below-layer cell or leave the map, and can enter every walkable in-bounds cell.
- **SC-002**: Same-depth and above-only scenery never blocks movement in 100% of automated scenarios.
- **SC-003**: A creator can mark a tile as blocking and verify the effect in preview in at most three interactions.
- **SC-004**: Saved blocking marks are restored in 100% of persistence scenarios, and unmarked legacy tilesets remain fully walkable inside map bounds.
- **SC-005**: With the overlay on, highlighted cells match the runtime blocking result for every visible map state tested.
