import type { Tileset } from '@packages/types';

/**
 * Tileset Registry
 * 
 * Tilesets are static game assets (not user-created).
 * Add new tilesets here after adding the image file to /public.
 */

export const TILESETS: Tileset[] = [
  {
    id: 'ts1',
    name: 'RPG Tileset',
    image_source: '/tileset_final.png?v=3',
    tile_width: 128,  // Source tile size in the image
    tile_height: 128, // Source tile size in the image
  },
  // Add more tilesets as needed:
  // {
  //   id: 'ts2',
  //   name: 'Dungeon Tileset',
  //   image_source: '/tileset_dungeon.png',
  //   tile_width: 32,
  //   tile_height: 32,
  // },
];

/**
 * Get tileset by ID
 */
export function getTilesetById(id: string): Tileset | undefined {
  return TILESETS.find(t => t.id === id);
}

/**
 * Get default tileset (first in registry)
 */
export function getDefaultTileset(): Tileset {
  if (TILESETS.length === 0) {
    throw new Error('No tilesets registered');
  }
  return TILESETS[0];
}
