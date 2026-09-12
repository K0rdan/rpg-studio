import type { Entity } from '@packages/types';
import { DEFAULT_PLAYER_PROPERTIES } from '@packages/types';
import { InputManager } from './InputManager';
import { Renderer } from './Renderer';
import { SpriteRenderer } from './SpriteRenderer';
import { resolveMovement, type TerrainCollisionContext } from './terrainCollision';

/** Direction-driven animation state for RPG Maker-style charsets. */
function getAnimationState(dx: number, dy: number): string {
  if (dy > 0) return 'walk_down';
  if (dy < 0) return 'walk_up';
  if (dx > 0) return 'walk_right';
  if (dx < 0) return 'walk_left';
  return 'idle';
}

export class PlayerController {
  private x: number;
  private y: number;
  /** Speed in tiles per second (data-driven from entity.playerProperties). */
  private speed: number;
  private tileWidth: number;
  private tileHeight: number;
  /** Optional sprite renderer — set via setSpriteRenderer() when a charset is loaded. */
  private spriteRenderer: SpriteRenderer | null = null;
  /**
   * Set when a sprite was assigned to this entity but could not be loaded
   * (e.g. storage service unreachable). Triggers a distinct ⚠️ render.
   */
  private spriteUnavailableName: string | null = null;

  constructor(playerEntity: Entity, tileWidth: number, tileHeight: number) {
    this.x = playerEntity.x;
    this.y = playerEntity.y;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.speed = playerEntity.playerProperties?.speed ?? DEFAULT_PLAYER_PROPERTIES.speed;
  }

  /** Attach a loaded SpriteRenderer so the player renders its charset instead of the placeholder. */
  public setSpriteRenderer(sr: SpriteRenderer): void {
    this.spriteRenderer = sr;
    this.spriteUnavailableName = null; // clear any previous unavailability marker
  }

  /**
   * Call this when the entity has a spriteId but the image could not be loaded
   * (e.g. Azure storage is temporarily unreachable). Renders an amber ⚠️ indicator
   * instead of the normal blue 🎮 fallback, so the problem is immediately visible.
   */
  public markSpriteUnavailable(spriteName: string): void {
    this.spriteUnavailableName = spriteName;
    this.spriteRenderer = null;
  }

  /**
   * @param collision Map and tileset to resolve terrain against. Omitted when no
   * map context is available, in which case only the origin clamp applies.
   */
  public update(deltaTime: number, input: InputManager, collision?: TerrainCollisionContext | null) {
    let dx = 0, dy = 0;

    if (input.isKeyDown('ArrowUp') || input.isKeyDown('w') || input.isKeyDown('W')) dy = -1;
    if (input.isKeyDown('ArrowDown') || input.isKeyDown('s') || input.isKeyDown('S')) dy = 1;
    if (input.isKeyDown('ArrowLeft') || input.isKeyDown('a') || input.isKeyDown('A')) dx = -1;
    if (input.isKeyDown('ArrowRight') || input.isKeyDown('d') || input.isKeyDown('D')) dx = 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    // Proposed position: tiles = (tiles/s) / 1000 * ms
    const targetX = this.x + dx * (this.speed / 1000) * deltaTime;
    const targetY = this.y + dy * (this.speed / 1000) * deltaTime;

    if (collision) {
      const resolved = resolveMovement(
        collision.map,
        collision.tileset,
        { x: this.x, y: this.y },
        { x: targetX, y: targetY },
      );
      this.x = resolved.x;
      this.y = resolved.y;
    } else {
      // No map context: keep the legacy origin clamp so the player stays on screen.
      this.x = Math.max(0, targetX);
      this.y = Math.max(0, targetY);
    }

    // Drive animation from movement direction
    if (this.spriteRenderer) {
      const animState = getAnimationState(dx, dy);
      this.spriteRenderer.setAnimation(animState);
      this.spriteRenderer.update(deltaTime);
    }
  }

  public render(renderer: Renderer) {
    const pixelX = this.x * this.tileWidth;
    const pixelY = this.y * this.tileHeight;

    // --- Charset render path ---
    if (this.spriteRenderer) {
      this.spriteRenderer.render(
        renderer,
        pixelX,
        pixelY,
        this.tileWidth,
        this.tileHeight,
      );
      return;
    }

    const ctx = renderer.getContext();

    // --- Sprite assigned but unavailable (storage offline) ---
    if (this.spriteUnavailableName !== null) {
      ctx.fillStyle = '#7B3F00'; // dark amber
      ctx.fillRect(pixelX, pixelY, this.tileWidth, this.tileHeight);
      ctx.strokeStyle = '#FF8C00';
      ctx.lineWidth = 2;
      ctx.strokeRect(pixelX + 1, pixelY + 1, this.tileWidth - 2, this.tileHeight - 2);
      ctx.fillStyle = '#FF8C00';
      ctx.font = `${this.tileWidth * 0.55}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠', pixelX + this.tileWidth / 2, pixelY + this.tileHeight / 2);
      return;
    }

    // --- Default fallback: no sprite assigned — blue 🎮 box ---
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(pixelX, pixelY, this.tileWidth, this.tileHeight);
    ctx.strokeStyle = '#1976D2';
    ctx.lineWidth = 2;
    ctx.strokeRect(pixelX, pixelY, this.tileWidth, this.tileHeight);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${this.tileWidth * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎮', pixelX + this.tileWidth / 2, pixelY + this.tileHeight / 2);
  }

  public getPosition() {
    return { x: this.x, y: this.y };
  }

  public getRenderDepth(): number {
    return (this.y + 1) * this.tileHeight;
  }
}
