# Feature Specification: Asset Folders

**Feature Branch**: `021-asset-folders`
**Created**: 2026-09-16
**Status**: Draft
**Input**: Let game creators add and delete assets directly from the Assets tree, and organize tilesets and charsets into user-defined categories, for example a `Grass` folder containing `base material`, `edge`, `corner`, and a `Grass ↔ Dirt` folder containing transition tiles.

## User Scenarios & Testing

### User Story 1 - Organize assets into folders (Priority: P1)

As a game creator, I can create nested folders under Tilesets and Charsets and place assets in them, so a project with many terrain variants stays readable instead of being one flat list.

**Why this priority**: The flat list is the actual pain; naming conventions like `grass-edge-01` do not scale and cannot be collapsed.

**Independent Test**: Create `Grass`, then `Grass/edge`, put one tileset in it, reload the editor, and confirm the tileset is still under `Grass/edge` and the empty sibling folders are still listed.

**Acceptance Scenarios**:

1. **Given** the Tilesets node, **When** the creator creates a folder `Grass`, **Then** `Grass` appears under Tilesets and survives a reload.
2. **Given** the folder `Grass`, **When** the creator creates `edge` inside it, **Then** it appears as a child of `Grass`.
3. **Given** an existing project whose assets predate this feature, **When** the tree is opened, **Then** every asset appears at the root of its kind and nothing is hidden.
4. **Given** a folder with no assets in it, **When** the editor is reloaded, **Then** the folder is still shown.

---

### User Story 2 - Add assets from the tree into a folder (Priority: P2)

As a game creator, I can import an image file or generate an asset from the folder where I want it, so a new tileset lands in `Grass/edge` without a second move step.

**Why this priority**: Folders are only useful if new assets can reach them; file import from the tree did not exist before (feature 017 excluded it).

**Independent Test**: From the `Grass/edge` folder, upload a tileset image and generate a charset in another folder; confirm both appear under the folder they were created from.

**Acceptance Scenarios**:

1. **Given** a folder under Tilesets, **When** the creator uploads an image file from that folder, **Then** the new tileset is created inside that folder.
2. **Given** a folder under Charsets, **When** the creator uploads a spritesheet from that folder, **Then** the new charset is created inside that folder.
3. **Given** any folder, **When** the creator generates an asset from it, **Then** the generated asset is saved into that folder.
4. **Given** the root of Tilesets or Charsets, **When** the creator adds an asset there, **Then** the asset is created at the root.

---

### User Story 3 - Move and delete from the tree (Priority: P3)

As a game creator, I can move an asset to another folder and delete an unused asset without opening the Inspector, so reorganizing and cleaning up happen where I am already looking.

**Why this priority**: Reorganization is a follow-up to creation, and delete already existed but only worked while the Inspector for that asset was open.

**Independent Test**: Move a tileset from the root to `Grass`, then delete an unused charset from the tree with the right sidebar closed, and attempt to delete an in-use tileset.

**Acceptance Scenarios**:

1. **Given** an asset in one folder, **When** the creator moves it to another folder, **Then** it appears under the target folder and its image still loads.
2. **Given** an unused project asset, **When** the creator deletes it from the tree with the Inspector closed, **Then** the asset is removed.
3. **Given** an asset that maps, entities, or characters still reference, **When** the creator tries to delete it, **Then** deletion is refused and the number of usages is shown.
4. **Given** a built-in registry tileset, **When** the creator opens its context menu, **Then** delete is not offered.
5. **Given** an empty folder, **When** the creator deletes it, **Then** it disappears; **Given** a folder holding assets or subfolders, **When** the creator deletes it, **Then** it is refused with a reason.

### Edge Cases

- Folder paths are normalized: surrounding spaces, empty segments, and duplicate separators are collapsed; `.` and `..` segments are rejected.
- Creating `Grass/edge/outer` in one action also creates `Grass` and `Grass/edge` so the branch is reachable.
- An asset whose folder was never registered still renders its folder branch, so a folder cannot silently swallow assets.
- Deleting a folder is refused while any asset sits in it **or in any of its descendants**, so assets can never be removed as a side effect.
- Moving an asset never moves or renames its stored image, so existing image links keep working.
- Built-in registry tilesets have no stored folder and always show at the root of Tilesets.
- Sounds remain a placeholder: no folders, no add, no delete.

## Requirements

### Functional Requirements

- **FR-001**: Tilesets and charsets MUST each support user-defined, arbitrarily nested folders, kept separate per asset kind.
- **FR-002**: An asset MUST belong to at most one folder; an asset with no folder belongs to the root of its kind.
- **FR-003**: Assets created before this feature MUST appear at the root of their kind without any migration.
- **FR-004**: Folders MUST persist per project, including folders that contain no assets.
- **FR-005**: Creating a nested folder MUST also create its missing parent folders.
- **FR-006**: Folder paths MUST be normalized and MUST reject path traversal segments.
- **FR-007**: Users MUST be able to import an image file as a new tileset or charset directly from the Assets tree.
- **FR-008**: Asset creation from the tree (import and generation) MUST place the asset in the folder it was started from.
- **FR-009**: Users MUST be able to move an existing asset to another folder or back to the root.
- **FR-010**: Moving or renaming an asset MUST NOT change where its image is stored.
- **FR-011**: Users MUST be able to delete an asset from the tree without the Inspector for that asset being open.
- **FR-012**: Deleting an asset MUST remain refused while it has usages, and MUST remain unavailable for built-in registry tilesets.
- **FR-013**: Deleting a folder MUST be refused while it contains any asset or subfolder, at any depth.
- **FR-014**: Built-in registry tilesets MUST NOT be assignable to a folder.
- **FR-015**: Sounds MUST stay out of scope: no folders, no import, no delete.

### Key Entities

- **Asset folder**: A named, nestable category belonging to one project and one asset kind; holds no data of its own.
- **Folder path**: The position of a folder or an asset under its kind, expressed as folder names from the kind root; absent means root.
- **Project folder list**: The folders a project has declared, so empty folders survive reloads.

## Assumptions

- Tilesets, Charsets, and Sounds stay fixed top-level nodes; user folders nest inside them rather than forming one mixed tree.
- Folders are an organizational concern only: rendering, preview, play, collision, and asset usage ignore them.
- Stored image locations stay keyed by asset id, so folders are free to be renamed or reorganized later.
- Usage rules and delete refusals from feature 017 are unchanged; this feature only changes where delete can be triggered from.
- Autotile behavior is out of scope. A folder named `Grass ↔ Dirt` documents intent for the creator; it does not make the editor compute transitions.
- Folder rename, drag-and-drop between folders, and multi-select moves are out of scope.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A creator can place a newly imported tileset into a nested folder without leaving the Assets tree.
- **SC-002**: Folder structure and asset placement are identical after reloading the editor, including empty folders.
- **SC-003**: Projects created before this feature open with every asset visible and unchanged.
- **SC-004**: 100% of attempts to delete a non-empty folder leave both the folder and its assets in place.
- **SC-005**: An unused asset can be deleted from the tree regardless of whether the right sidebar is open.
