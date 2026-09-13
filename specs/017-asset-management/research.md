# Research: Asset Management

## Entry point and layout

**Decision**: Keep the Project Explorer Assets tree as the only entry. Selecting a tileset or charset updates `selectionStore`. The Context Panel shows visual preview; the Inspector shows properties, usage, and delete.

**Rationale**: Spec 009 already defined `SelectionType` including `tileset` and `charset`. Tileset selection already opens `TilePalette`. A separate library page would duplicate navigation.

**Alternatives considered**: Standalone `/assets` page; modal gallery; putting usage only in a hover tooltip.

## No generic Asset type

**Decision**: Do not add `Asset` to `packages/types`. Add only `AssetKind` (`'tileset' | 'charset'`), `AssetUsage`, and `AssetUsageResponse`. Sounds are excluded from the union.

**Rationale**: Tileset and Sprite already differ (tile size vs frame/animations, different collections and blob paths). A premature union would force fake fields for sounds that do not exist.

**Alternatives considered**: A polymorphic `Asset` with optional blobs; renaming Sprite to Charset in types (out of scope, breaking).

## Usage computation

**Decision**: Compute usages on demand. Scope every scan to the current project's `maps` and `characters` ID lists (same pattern as list endpoints).

- Tileset: maps in the project whose `tilesetId` equals the asset id.
- Charset: entities on those maps whose `spriteId` equals the asset id; characters in the project whose `spriteId` equals the asset id.

Empty `spriteId` / `tilesetId` is not a usage of any asset.

**Rationale**: Projects are small. A persisted reverse index would need writes on every map/entity/character update. The current tileset DELETE already scans maps, but it queries `{ tilesetId }` globally — this feature MUST restrict to the project's map IDs so another project's map cannot block or leak.

**Alternatives considered**: Reverse-index collection; client-side scan of already-fetched maps (incomplete if maps are not all loaded); global `tilesetId` query without project scope.

## Built-in vs project tilesets

**Decision**: Treat a tileset as built-in when it exists in the static registry (`getTilesetById`) and has no Mongo tileset document for this project. Surface a `origin: 'registry' | 'project'` flag in the inspector (derived, not a new persisted field). DELETE of registry ids returns `403` (or equivalent) and is hidden in the UI.

**Rationale**: Registry tilesets are shared code assets (`ts1`, etc.). There is nothing to delete without breaking other projects. Collision overlays for registry tilesets stay as they are and are not removed by this feature.

**Alternatives considered**: Cloning registry tilesets into the project to make them deletable; allowing delete of overlays only.

## Delete policy

**Decision**: Refuse delete when `usages.length > 0`. Return `409` with the same usage payload as GET usage. No cascade, no force flag in this feature. Sprite DELETE today does not scan references — add the same guard as tileset DELETE, then delete blob + Mongo + project `sprites` pull.

**Rationale**: Dangling `tilesetId` / `spriteId` breaks preview and play. Showing usages lets the creator reassign (change map tileset or entity sprite) then delete.

**Alternatives considered**: Cascade-null references; force query param; soft-delete.

## Charset preview

**Decision**: Context Panel renders a `CharsetPreview`: full sheet with pixelated scaling, plus one idle frame. Inspector repeats a small thumbnail, name, frame size, and unavailable warning when `image_source` is empty.

**Rationale**: The 16×16 tree thumbnail is not enough to identify a sheet. TilePalette already covers tileset preview; charset currently falls through to EmptyState.

**Alternatives considered**: Animated walk cycle in the inspector; opening a dialog; reusing EntityPalette.

## Sounds placeholder

**Decision**: Leave the Sounds node in the tree but label it as unavailable / coming soon. No API, no selection type behavior, no Cypress coverage beyond “does not offer delete/preview”.

**Rationale**: Spec FR-013. Removing the node would be a larger layout change than this feature needs.

**Alternatives considered**: Hide the node; stub a Sound type.

## Context menu vs inspector actions

**Decision**: Delete and “reveal usages” live in the Inspector for the selected asset. Also add `AssetContextMenu` (right-click) with Delete when allowed, matching the unfinished spec 009 task, so creators do not have to remember the Inspector.

**Rationale**: Spec FR-015 allows inspector and/or menu. Doing both is small once DELETE is safe.

**Alternatives considered**: Menu only; Inspector only.
