# Data Model: Asset Folders

## Folder path

A `/`-separated path under the asset kind root, without a leading or trailing separator.

| Value | Meaning |
| --- | --- |
| absent or `''` | Root of the kind |
| `Grass` | Top-level folder |
| `Grass/edge` | Nested folder |

Normalization trims each segment, drops empty segments, rejects `.` and `..`, and caps the path at 255 characters. An invalid path is rejected rather than silently repaired.

## Tileset / Sprite

- `folderPath?: string` — where the asset sits under its kind. Absent means root.

Folders are metadata only: the stored image key stays derived from the asset id, so a move is a document update and never touches storage.

## GameProject

- `assetFolders?: { tileset?: string[]; charset?: string[] }` — folders the project has declared.

This list exists so a folder with no assets still shows after a reload. It is not the only source of the tree: the tree also derives folders from the ancestors of each asset's `folderPath`, so an asset can never be hidden by a missing entry here.

## Built-in tilesets

Registry tilesets have no document and therefore no `folderPath`. They always render at the root of Tilesets.

## Compatibility

- Documents without `folderPath` render at the root.
- Projects without `assetFolders` start with no declared folders.
- No migration is required, and no existing field changes meaning.
