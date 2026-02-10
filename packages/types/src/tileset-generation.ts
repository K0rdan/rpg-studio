// Style presets for tileset generation
export enum TilesetStyle {
  MEDIEVAL = 'medieval',
  CARTOON = 'cartoon',
  FANTASY = 'fantasy',
  SCI_FI = 'sci_fi',
  DUNGEON = 'dungeon',
  NATURE = 'nature',
  URBAN = 'urban',
  CUSTOM = 'custom',
}

// Common tile sizes
export const COMMON_TILE_SIZES = [16, 32, 64, 128] as const;
export type TileSize = typeof COMMON_TILE_SIZES[number];

// Generation request from client
export interface TilesetGenerationRequest {
  name: string;
  tile_width: number;
  tile_height: number;
  style: TilesetStyle;
  custom_prompt?: string; // Additional prompt refinement
  reference_image_url?: string; // Optional reference from existing assets
}

// Generation metadata stored in DB
export interface TilesetGenerationMetadata {
  generated: boolean;
  style?: TilesetStyle;
  prompt?: string;
  generated_at?: Date;
}
