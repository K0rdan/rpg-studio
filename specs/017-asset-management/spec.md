# Feature Specification: Asset Management

**Feature Branch**: `017-asset-management`
**Created**: 2026-09-12
**Status**: Draft
**Input**: Let game creators inspect project tilesets and charsets from the Project Explorer: preview each asset, see where it is used, and delete unused project assets. Sounds stay out of scope. Built-in registry tilesets are not deletable. Deletion is blocked while maps, entities, or characters still reference the asset.

## User Scenarios & Testing

### User Story 1 - Preview a selected asset (Priority: P1)

As a game creator, I select a tileset or charset in the Project Explorer and immediately see what it looks like and its basic properties, so I can tell assets apart without guessing from names alone.

**Why this priority**: The explorer already lists names. Visual identification is the missing first value and does not depend on usage or deletion.

**Independent Test**: Open a project with at least one tileset and one charset, select each from Assets, and confirm a preview plus identifying properties appear without opening a separate page.

**Acceptance Scenarios**:

1. **Given** a project tileset listed under Assets, **When** the creator selects it, **Then** they see the tileset image (or tile grid) and properties such as name and tile size.
2. **Given** a charset listed under Assets, **When** the creator selects it, **Then** they see the spritesheet (or a representative frame) and properties such as name and frame size.
3. **Given** a built-in registry tileset, **When** the creator selects it, **Then** they see the same kind of preview and a clear indication that it is built-in.
4. **Given** a charset whose image is unavailable, **When** the creator selects it, **Then** they still see its name and a visible unavailable state rather than a blank inspector.
5. **Given** the Assets Sounds folder, **When** the creator expands it, **Then** it does not claim that sound management is available.

---

### User Story 2 - See where an asset is used (Priority: P2)

As a game creator, I see every place a selected tileset or charset is referenced so I know whether it is safe to change or remove.

**Why this priority**: Usage is the decision input for cleanup; it is independently useful even if delete is not yet wired in the UI.

**Independent Test**: Select a tileset used by a map and a charset used by an entity or character; confirm each usage list names those places and is empty for an unused asset. Clicking a usage opens that map or entity.

**Acceptance Scenarios**:

1. **Given** a tileset assigned to one or more maps, **When** the creator inspects that tileset, **Then** each of those maps appears in the usage list by name.
2. **Given** a charset assigned to one or more entities or characters, **When** the creator inspects that charset, **Then** each of those entities and characters appears in the usage list by name.
3. **Given** an asset with no remaining references, **When** the creator inspects it, **Then** the usage list clearly shows that it is unused.
4. **Given** a usage list with a map or entity, **When** the creator chooses that usage, **Then** the editor selects that map or entity so they can see the reference in context.
5. **Given** a built-in tileset used by maps, **When** the creator inspects it, **Then** those maps still appear in the usage list.

---

### User Story 3 - Delete unused project assets (Priority: P3)

As a game creator, I can delete a project tileset or charset that nothing uses, and I am stopped (with the current usages shown) if something still references it.

**Why this priority**: Destructive cleanup is valuable only after preview and usage exist; blocking in-use deletes protects maps and characters.

**Independent Test**: Delete an unused project charset or tileset and confirm it leaves the Assets list and storage; attempt to delete an in-use asset and a built-in tileset and confirm both remain, with a reason shown.

**Acceptance Scenarios**:

1. **Given** a project tileset or charset with no usages, **When** the creator confirms delete, **Then** the asset disappears from Assets and is no longer available to maps or entities.
2. **Given** a tileset still assigned to a map, **When** the creator tries to delete it, **Then** deletion is refused and the blocking maps are shown.
3. **Given** a charset still assigned to an entity or character, **When** the creator tries to delete it, **Then** deletion is refused and the blocking references are shown.
4. **Given** a built-in registry tileset, **When** the creator looks for a delete action, **Then** delete is not offered (or is refused) with an explanation that built-in assets cannot be removed.
5. **Given** a delete confirmation, **When** the creator cancels, **Then** the asset is unchanged.

### Edge Cases

- An asset whose image URL fails still appears in the list and inspector with an unavailable state; delete of an unused project asset remains possible.
- A map, entity, or character that references a missing asset id still counts as a usage of that id if the id is queried.
- Selecting an asset does not change the active map until the creator follows a usage.
- Empty Tilesets or Charsets folders keep their existing empty labels.
- Sounds remain a non-functional placeholder and MUST NOT gain preview, usage, or delete.
- Replacing a reference (change a map's tileset, then delete the old one) is a two-step creator action; force-delete that clears references is out of scope.
- File import of new assets is out of scope; generation already exists.

## Requirements

### Functional Requirements

- **FR-001**: Users MUST be able to select a tileset or charset in the Project Explorer and inspect it in the existing editor layout (preview + properties), without leaving the map editor.
- **FR-002**: Selecting a tileset MUST show a visual preview of its image or tiles and identifying properties (name, tile size).
- **FR-003**: Selecting a charset MUST show a visual preview of its spritesheet or a representative frame and identifying properties (name, frame size).
- **FR-004**: Built-in registry tilesets MUST be visually distinguished from project tilesets and MUST NOT be deletable.
- **FR-005**: Users MUST be able to see all current usages of a selected tileset (maps that use it).
- **FR-006**: Users MUST be able to see all current usages of a selected charset (entities and characters that use it).
- **FR-007**: Users MUST be able to navigate from a usage entry to the corresponding map or entity in the editor.
- **FR-008**: Unused assets MUST be labeled as unused in the usage view.
- **FR-009**: Users MUST be able to delete a project tileset or charset that has zero usages, after an explicit confirmation.
- **FR-010**: The system MUST refuse to delete a tileset that any map still references, and MUST show those maps.
- **FR-011**: The system MUST refuse to delete a charset that any entity or character still references, and MUST show those references.
- **FR-012**: Canceling a delete confirmation MUST leave the asset unchanged.
- **FR-013**: Sounds MUST remain out of scope: no preview, usage, or delete for sounds.
- **FR-014**: Unavailable charset images MUST remain selectable and MUST surface an unavailable state in both the tree and the inspector.
- **FR-015**: Delete MUST be reachable from the selected asset (inspector and/or explorer context menu) without a separate asset-manager page.

### Key Entities

- **Project tileset**: A tileset owned by the project; previewable, listed in usages by maps, deletable only when unused.
- **Built-in tileset**: A registry tileset shared by the product; previewable and listed in usages, not deletable.
- **Charset**: A project spritesheet used by entities and/or characters; previewable, listed in usages, deletable only when unused.
- **Asset usage**: A named reference from a map, entity, or character to a tileset or charset.
- **Unavailable charset**: A charset record whose image cannot be loaded; still a first-class selectable asset.

## Assumptions

- The existing Assets tree (Tilesets, Charsets, Sounds) remains the entry point; no standalone asset library screen.
- Usage is computed on demand from current maps, entities, and characters; no persisted reverse index.
- Tileset usage is `map.tilesetId`. Charset usage is `entity.spriteId` and `character.spriteId`.
- Force-delete, bulk-delete, rename, import, and sound files are out of scope.
- Generation of tilesets and charsets already exists and is unchanged.
- Only project owners/editors who can already mutate the project may delete assets (same access as other project APIs).

## Success Criteria

### Measurable Outcomes

- **SC-001**: A creator can identify a selected tileset or charset visually (preview plus name/size) in at most two interactions from the Assets tree.
- **SC-002**: For every tileset and charset in the test project, the usage list matches the actual map, entity, and character references 100% of the time (including the unused case).
- **SC-003**: 100% of attempted deletes of in-use or built-in assets leave the asset in place and show why.
- **SC-004**: 100% of confirmed deletes of unused project assets remove them from the Assets list and from later usage queries.
- **SC-005**: Sounds never expose preview, usage, or delete in this feature.
