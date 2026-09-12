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
  tilesetId: string;
  layers: Layer[];
  entities?: Entity[]; // Optional for backward compatibility
}
