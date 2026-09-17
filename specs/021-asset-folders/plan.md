# Implementation Plan: Asset Folders

## Approach

An optional `folderPath` string on each asset, plus a per-project list of declared folders so empty ones survive. No new asset collection, no change to blob keys.

## Types

- `packages/types/src/asset-folder.ts`: `AssetFolderKind` (reuses `AssetKind`), `AssetFolder`, `AssetFolders`
- `Tileset.folderPath?`, `Sprite.folderPath?`
- `GameProject.assetFolders?`

## Editor — shared logic

`apps/editor/src/lib/assetFolders.ts`, used by both the routes and the tree:

- `normalizeAssetFolderPath`: trims segments, drops empty ones, rejects `.` / `..` and over-long paths; returns `''` for root and `null` for invalid
- `listAssetFolders`: normalized, deduplicated, sorted folders for one kind
- `assetFolderAncestors`: every parent path, used to create a nested folder in one call
- `isAssetFolderKind`: guards the `kind` coming from request bodies

## Editor — API

- New `asset-folders` route: `GET` (both kinds), `POST` (create + ancestors), `DELETE` (empty only)
- Tileset and sprite `POST` and `save-generated`: accept an optional `folderPath`
- Tileset `PATCH`: extended from tiles-only to `{ tiles?, name?, folderPath? }`; registry tilesets still only accept `tiles`
- Sprite `PATCH`: new, `{ name?, folderPath? }`
- `GET` responses expose `folderPath`

Storage is untouched by every path above: moving an asset is a document update only.

## Editor — UI

- `AssetFolderSection`: recursive tree section shared by Tilesets and Charsets; folders come from the project list unioned with the ancestors of each asset's `folderPath`, so an asset is never hidden by a missing folder record
- `AssetsTree`: folder create/delete, move dialog, and a delete dialog that queries usage itself instead of depending on the Inspector being mounted
- `TilesetUpload` gains an icon-only mode; `CharsetUploadDialog` is new; both generate dialogs take the target folder

## Incidental fixes

- Tileset upload used two different generated ids for the blob and the document, which left the blob orphaned on delete; it now uses one id
- Sprite `GET` is scoped by `projectId` and validates the id before querying

## Tests

Unit tests for path normalization, folder listing, and ancestors. Cypress coverage for create/add/move/delete in the tree is the remaining gap.
