# Implementation Plan: Multi Tileset Maps

## Approach

Packed tile refs in existing `number[]` layer data, plus append-only `Map.tilesetIds`.

## Types

Extend `Map` in `packages/types/src/map.ts`.

## Core

- `tileRef.ts`: `EMPTY_TILE`, `encodeTileRef`, `decodeTileRef`
- `resolveTileset.ts`: `resolveMapTilesetIds`; `resolveMapTileset` uses `tilesetIds[0]` then `tilesetId`
- `MapRenderer`: draw from a list of `{ tileset, image }` keyed by id
- `terrainCollision`: look up collision tileset by decoded index
- `GameEngine`: load every usable tileset image passed to `init`

## Editor

- `paintTileOnMap` accepts `tilesetId`, appends to `tilesetIds`, writes packed values
- Palette selection is not reset on every map paint
- Collision overlay passes the map's tileset list
- Map create/save persist `tilesetIds`
- Asset usage scans default + painted extra tilesets

## Tests

Unit tests for encode/decode, mixed-tileset render and collision, painting append, usage, and legacy local ids.
