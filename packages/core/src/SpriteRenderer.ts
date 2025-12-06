import type { Sprite } from '@packages/types';
import { Renderer } from './Renderer';

export class SpriteRenderer {
  private sprite: Sprite;
  private image: HTMLImageElement;
  private currentAnimation: string = 'idle';
  private currentFrameIndex: number = 0;
  private frameTime: number = 0;
  private frameDuration: number = 100; // ms

  constructor(sprite: Sprite, image: HTMLImageElement) {
    this.sprite = sprite;
    this.image = image;
  }

  public update(deltaTime: number) {
    this.frameTime += deltaTime;
    if (this.frameTime >= this.frameDuration) {
      this.frameTime = 0;
      this.currentFrameIndex++;
      const frames = this.sprite.animations[this.currentAnimation];
      if (frames && this.currentFrameIndex >= frames.length) {
        this.currentFrameIndex = 0;
      }
    }
  }

  public render(renderer: Renderer, x: number, y: number, width?: number, height?: number) {
    const frames = this.sprite.animations[this.currentAnimation];
    if (!frames || frames.length === 0) return;

    const frameIndex = frames[this.currentFrameIndex];
    
    const cols = Math.floor(this.image.width / this.sprite.frame_width);
    const sx = (frameIndex % cols) * this.sprite.frame_width;
    const sy = Math.floor(frameIndex / cols) * this.sprite.frame_height;

    const destWidth = width || this.sprite.frame_width;
    const destHeight = height || this.sprite.frame_height;

    renderer.drawTile(
      this.image,
      sx, sy, this.sprite.frame_width, this.sprite.frame_height,
      x, y, destWidth, destHeight
    );
  }
  
  public setAnimation(name: string) {
    if (this.currentAnimation !== name && this.sprite.animations[name]) {
      this.currentAnimation = name;
      this.currentFrameIndex = 0;
      this.frameTime = 0;
    }
  }
}
