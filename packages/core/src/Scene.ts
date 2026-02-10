import type { Map as GameMap, Character, Entity } from '@packages/types';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';
import { MapRenderer } from './MapRenderer';
import { SpriteRenderer } from './SpriteRenderer';
import { EntityRenderer } from './EntityRenderer';

interface GameCharacter {
  data: Character;
  x: number;
  y: number;
  renderer: SpriteRenderer;
}

export class Scene {
  private map: GameMap | null = null;
  private mapRenderer: MapRenderer | null = null;
  private characters: GameCharacter[] = [];
  private entityRenderers: EntityRenderer[] = [];

  public loadMap(map: GameMap) {
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

  public loadEntities(entities: Entity[], tileWidth: number, tileHeight: number, spriteRenderers: Map<string, SpriteRenderer>) {
    this.entityRenderers = entities.map(entity => {
      let spriteRenderer: SpriteRenderer | null = null;
      
      // Get sprite renderer for entities that have sprites
      if ('spriteId' in entity && entity.spriteId) {
        spriteRenderer = spriteRenderers.get(entity.spriteId) || null;
      }
      
      return new EntityRenderer(entity, spriteRenderer, tileWidth, tileHeight);
    });
  }

  public getEntities(): Entity[] {
    return this.entityRenderers.map(er => er.getEntity());
  }

  public getEntityById(id: string): Entity | undefined {
    const renderer = this.entityRenderers.find(er => er.getEntity().id === id);
    return renderer?.getEntity();
  }

  public getEntitiesAtPosition(x: number, y: number): Entity[] {
    return this.entityRenderers
      .map(er => er.getEntity())
      .filter(entity => entity.x === x && entity.y === y);
  }

  public update(deltaTime: number, input: InputManager) {
    const speed = 0.1; // pixels per ms
    
    // Update entity animations
    for (const entityRenderer of this.entityRenderers) {
      entityRenderer.update(deltaTime);
    }
    
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
          char.renderer.setAnimation('walk_right');
        } else if (input.isKeyDown('ArrowLeft')) {
          newX -= speed * deltaTime;
          moving = true;
          char.renderer.setAnimation('walk_left');
        } else if (input.isKeyDown('ArrowDown')) {
          newY += speed * deltaTime;
          moving = true;
          char.renderer.setAnimation('walk_down');
        } else if (input.isKeyDown('ArrowUp')) {
          newY -= speed * deltaTime;
          moving = true;
          char.renderer.setAnimation('walk_up');
        }

        if (moving) {
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
    
    // Render entities (after map, before characters)
    for (const entityRenderer of this.entityRenderers) {
      entityRenderer.render(renderer);
    }
    
    for (const char of this.characters) {
      char.renderer.render(renderer, char.x, char.y, 32, 32);
    }
  }
}
