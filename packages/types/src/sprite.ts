export interface Sprite {
  id: string;
  name: string;
  image_source: string;
  frame_width: number;
  frame_height: number;
  animations: Record<string, number[]>;
}
