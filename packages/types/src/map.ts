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
}
