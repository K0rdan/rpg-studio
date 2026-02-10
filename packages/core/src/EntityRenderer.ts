import type { Entity } from '@packages/types';
import { EntityType } from '@packages/types';
import { Renderer } from './Renderer';
import { SpriteRenderer } from './SpriteRenderer';

export class EntityRenderer {
  private entity: Entity;
  private spriteRenderer: SpriteRenderer | null;
  private tileWidth: number;
  private tileHeight: number;

  constructor(
    entity: Entity,
    spriteRenderer: SpriteRenderer | null,
    tileWidth: number,
    tileHeight: number
  ) {
    this.entity = entity;
    this.spriteRenderer = spriteRenderer;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  public update(deltaTime: number) {
    if (this.spriteRenderer) {
      this.spriteRenderer.update(deltaTime);
    }
  }

  public render(renderer: Renderer) {
    // Calculate pixel position from tile coordinates
    const pixelX = this.entity.x * this.tileWidth;
    const pixelY = this.entity.y * this.tileHeight;

    // Render based on entity type
    if (this.spriteRenderer) {
      // For PlayerSpawn and NPC entities with sprites
      this.spriteRenderer.render(renderer, pixelX, pixelY, this.tileWidth, this.tileHeight);
    } else {
      // For Interaction entities or entities without sprites
      this.renderPlaceholder(renderer, pixelX, pixelY);
    }
  }

  private renderPlaceholder(renderer: Renderer, x: number, y: number) {
    // Draw a simple colored square as placeholder for interaction entities
    const ctx = renderer.getContext();
    
    ctx.save();
    ctx.fillStyle = this.getPlaceholderColor();
    ctx.globalAlpha = 0.5;
    
    // Draw a smaller square in the center of the tile
    const padding = this.tileWidth * 0.25;
    ctx.fillRect(
      x + padding,
      y + padding,
      this.tileWidth - padding * 2,
      this.tileHeight - padding * 2
    );
    
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  private getPlaceholderColor(): string {
    switch (this.entity.type) {
      case EntityType.PlayerSpawn:
        return '#00FF00'; // Green
      case EntityType.NPC:
        return '#0000FF'; // Blue
      case EntityType.Interaction:
        return '#FFFF00'; // Yellow
      default:
        return '#FF00FF'; // Magenta for unknown types
    }
  }

  public getEntity(): Entity {
    return this.entity;
  }

  public setEntity(entity: Entity) {
    this.entity = entity;
  }
}
