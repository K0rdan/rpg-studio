import type { Entity } from '@packages/types';
import { DEFAULT_PLAYER_PROPERTIES } from '@packages/types';
import { InputManager } from './InputManager';
import { Renderer } from './Renderer';

export class PlayerController {
  private x: number;
  private y: number;
  /** Speed in tiles per second (data-driven from entity.playerProperties). */
  private speed: number;
  private tileWidth: number;
  private tileHeight: number;

  constructor(playerEntity: Entity, tileWidth: number, tileHeight: number) {
    this.x = playerEntity.x;
    this.y = playerEntity.y;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    // Read speed from entity data; fall back to sensible default
    this.speed = playerEntity.playerProperties?.speed ?? DEFAULT_PLAYER_PROPERTIES.speed;
  }

  public update(deltaTime: number, input: InputManager) {
    let dx = 0, dy = 0;

    // WASD and Arrow keys for movement
    if (input.isKeyDown('ArrowUp') || input.isKeyDown('w') || input.isKeyDown('W')) {
      dy = -1;
    }
    if (input.isKeyDown('ArrowDown') || input.isKeyDown('s') || input.isKeyDown('S')) {
      dy = 1;
    }
    if (input.isKeyDown('ArrowLeft') || input.isKeyDown('a') || input.isKeyDown('A')) {
      dx = -1;
    }
    if (input.isKeyDown('ArrowRight') || input.isKeyDown('d') || input.isKeyDown('D')) {
      dx = 1;
    }

    // Normalize diagonal movement so it is not faster than cardinal
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707; // 1/sqrt(2)
      dy *= 0.707;
    }

    // Update position — speed is tiles/second, deltaTime is milliseconds
    // Formula: tiles = (tiles/s) / 1000 * ms
    this.x += dx * (this.speed / 1000) * deltaTime;
    this.y += dy * (this.speed / 1000) * deltaTime;

    // Clamp to positive values (basic bounds checking)
    this.x = Math.max(0, this.x);
    this.y = Math.max(0, this.y);
  }

  public render(renderer: Renderer) {
    const pixelX = this.x * this.tileWidth;
    const pixelY = this.y * this.tileHeight;

    const ctx = renderer.getContext();

    // Draw player as blue square with game controller icon
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(pixelX, pixelY, this.tileWidth, this.tileHeight);

    // Border
    ctx.strokeStyle = '#1976D2';
    ctx.lineWidth = 2;
    ctx.strokeRect(pixelX, pixelY, this.tileWidth, this.tileHeight);

    // Icon
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${this.tileWidth * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎮', pixelX + this.tileWidth / 2, pixelY + this.tileHeight / 2);
  }

  public getPosition() {
    return { x: this.x, y: this.y };
  }
}
