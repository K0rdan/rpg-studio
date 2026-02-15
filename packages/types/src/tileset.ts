import type { TileProperties } from './tile';
import type { TilesetGenerationMetadata } from './tileset-generation';

export interface Tileset {
  id: string;
  name: string;
  image_source: string;
  tile_width: number;          // Display tile size (e.g., 32px)
  tile_height: number;         // Display tile size (e.g., 32px)
  source_tile_width?: number;  // Source image tile size (e.g., 128px) - optional for backward compatibility
  source_tile_height?: number; // Source image tile size (e.g., 128px) - optional for backward compatibility
  tiles?: TileProperties[];
  generation_metadata?: TilesetGenerationMetadata;
}
