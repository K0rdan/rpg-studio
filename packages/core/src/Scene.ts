import type { Map, Character } from '@packages/types';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';
import { MapRenderer } from './MapRenderer';
import { SpriteRenderer } from './SpriteRenderer';

interface GameCharacter {
  data: Character;
  x: number;
  y: number;
  renderer: SpriteRenderer;
}

export class Scene {
  private map: Map | null = null;
  private mapRenderer: MapRenderer | null = null;
  private characters: GameCharacter[] = [];

  public loadMap(map: Map) {
    this.map = map;
  }

  public setMapRenderer(renderer: MapRenderer) {
    this.mapRenderer = renderer;
  }

  public addCharacter(character: Character, renderer: SpriteRenderer, x: number, y: number) {
    this.characters.push({ data: character, renderer, x, y });
  }

  public getCharacters() {
    return this.characters;
  }

  public update(deltaTime: number, input: InputManager) {
    const speed = 0.1; // pixels per ms
    
    for (const char of this.characters) {
      char.renderer.update(deltaTime);
      
      // Simple movement logic for the first character (player)
      if (this.characters.indexOf(char) === 0) {
        let newX = char.x;
        let newY = char.y;
        let moving = false;

        if (input.isKeyDown('ArrowRight')) {
          newX += speed * deltaTime;
          moving = true;
        } else if (input.isKeyDown('ArrowLeft')) {
          newX -= speed * deltaTime;
          moving = true;
        } else if (input.isKeyDown('ArrowDown')) {
          newY += speed * deltaTime;
          moving = true;
        } else if (input.isKeyDown('ArrowUp')) {
          newY -= speed * deltaTime;
          moving = true;
        }

        if (moving) {
          char.renderer.setAnimation('walk');
          
          // Collision Check (Map Bounds)
          // Assuming 32x32 tiles for MVP
          const tileSize = 32;
          
          if (this.map) {
            const mapWidthPx = this.map.width * tileSize;
            const mapHeightPx = this.map.height * tileSize;
            const charSize = 32; // Assuming character is 32x32
            
            if (newX >= 0 && newX + charSize <= mapWidthPx) {
              char.x = newX;
            }
            if (newY >= 0 && newY + charSize <= mapHeightPx) {
              char.y = newY;
            }
          } else {
             char.x = newX;
             char.y = newY;
          }
        } else {
          char.renderer.setAnimation('idle');
        }
      }
    }
  }

  public render(renderer: Renderer) {
    if (this.mapRenderer) {
      this.mapRenderer.render(renderer);
    }
    
    for (const char of this.characters) {
      char.renderer.render(renderer, char.x, char.y);
    }
  }
}
