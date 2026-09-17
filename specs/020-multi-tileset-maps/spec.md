# Feature Specification: Multi Tileset Maps

**Feature Branch**: `020-multi-tileset-maps`
**Created**: 2026-09-15
**Status**: Draft
**Input**: Allow a map to paint tiles from more than one tileset, including mixing tilesets in the same layer cell by cell (for example grass from one tileset and trees from another).

## User Scenarios & Testing

### User Story 1 - Paint a second tileset on the same map (Priority: P1)

As a game creator, I can select another tileset in the palette and paint it onto the open map so that ground and objects can come from different assets.

**Why this priority**: Mixing tilesets is the core value; without it a map is still locked to one image.

**Independent Test**: Open a map that uses a grass tileset, switch the palette to a tree tileset, paint one cell, save, reopen, and confirm both tilesets still render in the editor and preview.

**Acceptance Scenarios**:

1. **Given** a map whose default tileset is grass, **When** the creator paints a tree tile from another tileset on the same layer, **Then** that cell shows the tree tile and other grass cells are unchanged.
2. **Given** a newly painted second tileset, **When** the map is saved and reopened, **Then** both tilesets render at the same cells.
3. **Given** an older map that only stores `tilesetId`, **When** it is opened, **Then** existing local tile indexes still draw from that tileset.

---

### User Story 2 - Collision follows the painted tileset (Priority: P2)

As a game creator, I can mark blocking tiles on each tileset so that a painted cell uses that tileset's collision, not the map's default tileset.

**Why this priority**: Mixed terrain is unusable if walls from tileset B are resolved as tile ids on tileset A.

**Independent Test**: Paint a blocking tile from tileset B next to walkable grass from tileset A on a below layer; preview and confirm the player is stopped only by B's blocking tile.

**Acceptance Scenarios**:

1. **Given** a blocking tile from tileset B painted on a below layer, **When** the player tries to enter that cell, **Then** movement is blocked using B's collision marks.
2. **Given** the same local tile index on tileset A (walkable) and tileset B (blocking), **When** those tiles are painted in different cells, **Then** only the B cell blocks.
3. **Given** the collision overlay, **When** mixed tilesets are painted, **Then** highlighted solids match each cell's tileset.

---

### User Story 3 - Default tileset still sets the grid (Priority: P3)

As a game creator, I can keep a default tileset on the map for grid size and as the first palette target without preventing other tilesets from being painted.

**Why this priority**: Display tile size and existing map properties remain understandable.

**Independent Test**: Change the map default tileset, confirm the grid size follows that tileset's display size, then paint from a second tileset that shares the same display size.

**Acceptance Scenarios**:

1. **Given** map properties, **When** the default tileset is changed, **Then** it becomes `tilesetIds[0]` / `tilesetId` and existing index-0 cells draw from the new default.
2. **Given** two tilesets with the same display tile size, **When** both are painted, **Then** they snap to the same map grid.
3. **Given** a tileset used only as an extra paint source with no remaining cells, **When** usage is queried, **Then** it is not treated as blocking deletion of that asset.

---

### Edge Cases

- Empty cells remain `-1` and are never looked up in a tileset.
- Painting the default tileset stores the same numeric local index as today (`tilesetIndex === 0`).
- Extra tilesets are appended to `tilesetIds` and never reordered or removed, so packed indexes stay stable.
- A packed cell whose tileset index is out of range or whose image failed to load is skipped at render time and treated as walkable.
- Maps without `tilesetIds` behave as `tilesetIds: [tilesetId]` when `tilesetId` is non-empty.
- Asset usage for the default tileset still counts even if no tiles are painted (same as today).

## Requirements

### Functional Requirements

- **FR-001**: A map MUST be able to reference multiple tilesets via `tilesetIds` while keeping `tilesetId` as the default (`tilesetIds[0]`).
- **FR-002**: Layer `data` MUST remain `number[]` with `-1` for empty cells.
- **FR-003**: Non-empty cells MUST encode `tilesetIndex << 16 | localId` so existing values below 65536 mean tileset 0.
- **FR-004**: Selecting a tileset in the palette and painting MUST write that tileset's local tile index into the active layer cell.
- **FR-005**: The first paint of a tileset not yet on the map MUST append it to `tilesetIds`.
- **FR-006**: Editor, preview, and player rendering MUST load and draw every referenced tileset image.
- **FR-007**: Terrain collision and the editor overlay MUST resolve blocking using the tileset encoded in each cell.
- **FR-008**: Display tile width/height for the map grid MUST come from the default tileset.
- **FR-009**: Tilesets painted on a map MUST share the default tileset's display tile size; source tile size may differ.
- **FR-010**: Tileset asset usage MUST include the default tileset and any extra tileset that still has at least one painted cell.

## Success Criteria

- A creator can author a map that uses a grass tileset and a tree tileset on one layer without merging images.
- Existing maps render and collide as they did before this change.
- Preview and play use the same packed cell values as the editor.
