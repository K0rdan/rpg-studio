import type { Entity } from '@packages/types';
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

    // Render based on whether entity has a sprite
    if (this.spriteRenderer) {
      // For entities with sprites (NPCs, etc.)
      this.spriteRenderer.render(renderer, pixelX, pixelY, this.tileWidth, this.tileHeight);
    } else {
      // For entities without sprites, show placeholder
      this.renderPlaceholder(renderer, pixelX, pixelY);
    }
  }

  private renderPlaceholder(renderer: Renderer, x: number, y: number) {
    // Draw a simple colored square as placeholder for entities without sprites
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
    // Use a default color for all entities without sprites
    // In the future, this could be based on trigger type or other properties
    return '#9C27B0'; // Purple for entities without sprites
  }

  public getEntity(): Entity {
    return this.entity;
  }

  public setEntity(entity: Entity) {
    this.entity = entity;
  }
}
