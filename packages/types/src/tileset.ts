import type { TileProperties } from './tile';

export interface Tileset {
  id: string;
  name: string;
  image_source: string;
  tile_width: number;
  tile_height: number;
  tiles?: TileProperties[];
}
