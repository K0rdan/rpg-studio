# Research: Multi Tileset Maps

## Decision: packed index vs Tiled firstGid vs per-cell objects

**Choice**: `tilesetIndex << 16 | localId` with append-only `tilesetIds`.

**Why**: Layer data stays `number[]`. Tileset growth does not shift other tilesets (unlike Tiled `firstGid`). Objects `{ tilesetId, tileId }` would rewrite every consumer of `data`.

## Decision: one tileset per layer

Rejected: the product requirement is mixing tilesets in the same layer.

## Decision: load all init tilesets in GameEngine

The editor can paint a tileset that was not on the map at engine init. Loading every usable tileset passed into `init` avoids a mid-session image miss after the first stroke of a new tileset.
