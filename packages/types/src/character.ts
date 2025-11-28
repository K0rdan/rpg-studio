import { Sprite } from './sprite';

export interface Character {
  id: string;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  sprite: Sprite;
}
