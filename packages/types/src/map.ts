import type { Entity } from './entity';

export type LayerRenderPriority = 'below' | 'same' | 'above';

export interface Layer {
  name: string;
  data: number[];
  /**
   * Controls whether the layer is rendered. Missing values are treated as
   * visible so maps created before layer visibility remain compatible.
   */
  visible?: boolean;
  /**
   * Controls how tiles overlap map actors. Missing values are treated as
   * `below` so maps created before render priorities remain compatible.
   */
  priority?: LayerRenderPriority;
}

export interface Map {
  id: string;
  name: string;
  width: number;
  height: number;
  /**
   * Default tileset and grid source. Alias of `tilesetIds[0]` when that list is
   * present. Kept so documents created before multi-tileset maps still load.
   */
  tilesetId: string;
  /**
   * Tilesets this map paints with, in packed-index order. Append-only: never
   * reorder or delete entries, or existing layer values would point at the wrong
   * tileset. Missing means `[tilesetId]` when `tilesetId` is non-empty.
   */
  tilesetIds?: string[];
  layers: Layer[];
  entities?: Entity[]; // Optional for backward compatibility
}
