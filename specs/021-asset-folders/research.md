# Research: Asset Folders

## Decision: folder path on the asset vs folder documents vs name conventions

**Choice**: an optional `folderPath` string on each asset, plus a declared-folder list on the project.

**Why**: Parsing `/` out of asset names would make a rename destructive and would collide with legitimate names. A separate folder collection with ids would force a join on every listing and a cascade on every delete, for data that is purely presentational. A path string keeps listings as they are and needs no migration, and the project list exists only to answer the one question a path cannot: which empty folders should still be shown.

## Decision: folders are not encoded in blob keys

Storage keys stay derived from the asset id. Encoding the folder in the key would turn a move into a blob copy plus delete, and would break the sprite key that is reconstructed rather than read from the document.

## Decision: derive folders from assets as well as from the project list

The tree unions the declared folders with the ancestors of every asset's `folderPath`. Without this, a project whose folder list is incomplete would render an asset nowhere. The two sources are cheap to merge and make the tree self-healing.

## Decision: refuse to delete a non-empty folder rather than cascade or reparent

Cascading would delete assets that maps still use, which contradicts feature 017. Reparenting to the root would silently undo organization. Refusing with a reason keeps the destructive action explicit and one asset at a time.

## Decision: decouple delete from the Inspector

Delete was previously an event picked up by the Inspector's usage section, so it did nothing when the right sidebar was closed. The tree now runs the usage check and confirmation itself, which was a prerequisite for offering delete on folder and asset nodes.

## Decision: separate trees per asset kind

Tilesets and charsets keep their own folder namespaces. They have different usage rules and independent id spaces, and a single mixed tree would make a folder's delete rules depend on its contents' kinds.
