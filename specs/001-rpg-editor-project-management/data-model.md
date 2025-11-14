# Data Model: RPG Editor Project Management

This document outlines the data structures for the RPG Editor, based on the entities defined in the feature specification. These types will be implemented in `packages/types`.

## GameProject

Represents the entire game. Contains all maps, assets, and configurations.

- **name**: `string` - The name of the project.
- **root_path**: `string` - The file system path to the project's root directory.
- **config**: `object` - A flexible object for project-level settings.

## Map

A 2D grid representing a single game area.

- **name**: `string` - The name of the map.
- **width**: `number` - The width of the map in tiles.
- **height**: `number` - The height of the map in tiles.
- **layers**: `Array<Layer>` - An array of tile layers.

## Layer

A single layer of tiles on a map.

- **name**: `string` - The name of the layer.
- **data**: `Array<number>` - A 1D array representing the 2D grid of tile IDs.

## Tileset

A collection of tiles that can be used to build maps.

- **name**: `string` - The name of the tileset.
- **image_source**: `string` - The path to the tileset image.
- **tile_width**: `number` - The width of a single tile in pixels.
- **tile_height**: `number` - The height of a single tile in pixels.

## Tile

A single graphical element within a Tileset. This is a conceptual entity; the actual data is managed by the `Tileset` and `Layer`.

- **id**: `number` - The ID of the tile within the tileset.
- **position_in_tileset**: `{ x: number, y: number }` - The x and y coordinates of the tile in the tileset image.

## Character

A game entity with defined attributes and a visual representation.

- **name**: `string` - The name of the character.
- **hp**: `number` - The character's health points.
- **attack**: `number` - The character's attack power.
- **defense**: `number` - The character's defense power.
- **sprite_id**: `string` - The ID of the sprite used for the character's visual representation.
