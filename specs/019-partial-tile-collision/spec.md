# Feature Specification: Partial Tile Collision

**Feature Branch**: `019-partial-tile-collision`
**Created**: 2026-09-14
**Status**: Draft
**Input**: Allow creators to author a collision rectangle per blocking tileset tile, resolve movement against those rectangles and a smaller player feet box, and optionally fit the rectangle to opaque pixels at edit time. Do not extend 016’s full-cell model in place. Layer participation stays as in 016 (visible below only).

## User Scenarios & Testing

### User Story 1 - Author a collision rectangle on a blocking tile (Priority: P1)

As a game creator, I can mark a tileset tile as blocking and shrink its solid area so only part of the cell stops the player.

**Why this priority**: Full-cell blocking is the main authoring pain for trunks, hedges, and rocks.

**Independent Test**: Mark a tile blocking, set its solid area to the bottom-center third of the cell, paint it on a below layer, preview, and walk through the empty sides while being stopped by the solid.

**Acceptance Scenarios**:

1. **Given** a blocking tile with no custom solid area, **When** the player tries to enter that cell, **Then** the whole cell still blocks (same as 016).
2. **Given** a blocking tile whose solid area is only part of the cell, **When** the player’s feet overlap empty space in that cell, **Then** movement continues.
3. **Given** a blocking tile with a partial solid, **When** the player’s feet overlap that solid, **Then** movement on the overlapping axis is refused and they can still slide on a free axis.
4. **Given** two below layers in the same cell with different solids, **When** the player overlaps either solid, **Then** they are stopped.
5. **Given** saved tileset collision rectangles, **When** the project is reopened, **Then** those rectangles still apply in preview and play.

---

### User Story 2 - Collide with the character’s feet (Priority: P1)

As a player, I am blocked by terrain against a box at my feet, not against my full sprite square, so I can stand closer to walls and pass beside partial solids.

**Why this priority**: Charsets are taller than their contact with the ground; a full 1×1 box fights trees and walls even when rectangles exist.

**Independent Test**: Place a full blocking wall in the cell to the right of the player; walk right and confirm they stop when the feet box meets the wall, while the visual sprite may overlap the wall cell’s upper area.

**Acceptance Scenarios**:

1. **Given** a player on walkable ground next to a full blocking cell, **When** they walk into it, **Then** they stop when the feet box first overlaps the solid, not when the sprite origin would enter the cell.
2. **Given** a player already overlapping a solid (for example after painting under them), **When** they walk away, **Then** they can leave; they are only prevented from entering newly overlapping solids.
3. **Given** map edges, **When** the feet box would leave the map, **Then** movement is refused.

---

### User Story 3 - Inspect collision shapes on the map (Priority: P1)

As a game creator, I can see the actual solid rectangles on the map overlay so I can verify partial collision without guessing.

**Why this priority**: An overlay that still fills the whole cell would hide the feature.

**Independent Test**: Enable the collision overlay on a map with mixed full and partial blocking tiles; highlighted shapes match the solids used at runtime, not only whole cells.

**Acceptance Scenarios**:

1. **Given** a full blocking below tile, **When** the overlay is shown, **Then** that cell is highlighted in full.
2. **Given** a partial collision rectangle, **When** the overlay is shown, **Then** only that rectangle inside the cell is highlighted.
3. **Given** overlay visible, **When** the creator changes a tile’s rectangle, paint, layer visibility, or blocking mark, **Then** the overlay updates to match runtime.

---

### User Story 4 - Fit the rectangle to opaque pixels (Priority: P2)

As a game creator, I can fit a selected blocking tile’s collision rectangle to its non-transparent pixels, then adjust it, without the game sampling pixels while playing.

**Why this priority**: Speeds authoring; must not change play-time rules.

**Independent Test**: Select a blocking tile that is mostly transparent with a small opaque blob, choose Fit opaque, confirm the rectangle matches that blob, preview, and confirm play uses the stored rectangle even if the image later changes until Fit is run again.

**Acceptance Scenarios**:

1. **Given** a selected blocking tile with opaque pixels, **When** the creator fits to opaque pixels, **Then** the collision rectangle becomes the tight box around pixels above a small opacity threshold and the tileset is unsaved.
2. **Given** a tile with no pixels above that threshold, **When** the creator fits to opaque pixels, **Then** the rectangle is unchanged and the creator is informed.
3. **Given** a fitted rectangle, **When** the game is played, **Then** movement uses the stored rectangle and does not read the image pixels.

---

### Edge Cases

- A blocking tile with an omitted rectangle behaves as a full-cell solid.
- A rectangle of zero width or height is invalid and is not stored.
- Rectangles are expressed in tile-local space from the top-left of the tile and stay inside the tile.
- Empty cells and unmarked tiles remain walkable.
- Hidden, same-depth, and above layers still do not contribute solids.
- Same-depth / above “props that block” still require a below solid (dummy tile or partial rect on below). A per-layer collision participation flag is out of scope.
- Pixel-perfect play, entity-to-entity collision, and one-way passage are out of scope.
- Fitting to opaque pixels is an editor action only; it never runs during preview or play movement.

## Requirements

### Functional Requirements

- **FR-001**: Users MUST be able to store an optional collision rectangle on each blocking tileset tile.
- **FR-002**: A blocking tile without a rectangle MUST block the full cell.
- **FR-003**: Movement MUST refuse a step when the player’s feet box newly overlaps a solid rectangle or leaves the map, and MUST slide on a free axis.
- **FR-004**: The default player contact box MUST be smaller than one cell and anchored toward the bottom of the sprite origin cell.
- **FR-005**: Solids already overlapping the current feet box MUST NOT prevent leaving that overlap.
- **FR-006**: Visible below layers remain the only layers that contribute solids; same-depth and above MUST NOT.
- **FR-007**: Collision rectangles MUST persist with the tileset (including registry overlays) and apply on every map that uses it.
- **FR-008**: The map collision overlay MUST draw the solid rectangles used at runtime.
- **FR-009**: Users MUST be able to edit the selected tile’s rectangle in the palette when the tile is blocking.
- **FR-010**: Users MUST be able to fit the selected blocking tile’s rectangle to opaque pixels in the editor; play MUST NOT sample tile images for collision.
- **FR-011**: Unmarked tiles and missing `tiles` MUST remain fully walkable inside the map.
- **FR-012**: Tileset rectangle and blocking edits MUST mark the tileset unsaved.

### Key Entities

- **Collision rectangle**: Optional axis-aligned box on a blocking tileset tile, in normalized tile space.
- **Player feet box**: Default contact box used for terrain, smaller than one cell, bottom-aligned in the origin cell.
- **Solid**: A rectangle in map space derived from a participating below-layer blocking tile (full cell or authored rect) or from map bounds.
- **Collision overlay**: Editor view of current solids.

## Assumptions

- This feature supersedes 016’s full-cell occupancy for the player; 016 blocking marks and below-only participation remain.
- One rectangle per tile is enough; concave shapes use multiple tiles.
- Opaque fit uses a small alpha threshold so anti-aliased edges are ignored.
- `contributesToCollision` per layer is deferred to a later feature.
- Editor preview and play share the same solid and feet-box rules.

## Success Criteria

- **SC-001**: In 100% of automated movement scenarios, the player cannot newly overlap a below-layer solid or leave the map with the feet box, and can occupy walkable space in a cell that is only partially solid.
- **SC-002**: A blocking tile with no rectangle still blocks the full cell in 100% of those scenarios.
- **SC-003**: Same-depth and above-only scenery never contribute solids in 100% of automated scenarios.
- **SC-004**: With the overlay on, highlighted shapes match runtime solids for every visible map state tested.
- **SC-005**: Fit-to-opaque updates only the stored rectangle and never changes movement when the image is not re-fitted.
- **SC-006**: Saved rectangles restore in 100% of persistence scenarios.
