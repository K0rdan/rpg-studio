import type { Entity } from './entity';

export interface Layer {
  name: string;
  data: number[];
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
