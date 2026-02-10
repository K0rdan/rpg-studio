import type { TileProperties } from './tile';
import type { TilesetGenerationMetadata } from './tileset-generation';

export interface Tileset {
  id: string;
  name: string;
  image_source: string;
  tile_width: number;
  tile_height: number;
  tiles?: TileProperties[];
  generation_metadata?: TilesetGenerationMetadata;
}
