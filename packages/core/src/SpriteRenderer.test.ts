import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpriteRenderer } from './SpriteRenderer';
import type { Sprite } from '@packages/types';
import { Renderer } from './Renderer';

describe('SpriteRenderer', () => {
  let spriteRenderer: SpriteRenderer;
  let renderer: Renderer;
  let sprite: Sprite;
  let image: HTMLImageElement;

  beforeEach(() => {
    renderer = {
      drawTile: vi.fn(),
    } as unknown as Renderer;

    sprite = {
      id: 's1',
      name: 'Hero',
      image_source: 'hero.png',
      frame_width: 32,
      frame_height: 32,
      animations: {
        idle: [0, 1],
        walk: [2, 3],
      },
    };

    image = {
      width: 64, // 2 cols
      height: 64,
    } as unknown as HTMLImageElement;

    spriteRenderer = new SpriteRenderer(sprite, image);
  });

  it('should render the first frame of idle animation by default', () => {
    spriteRenderer.render(renderer, 100, 100);
    // Frame 0: (0,0)
    expect(renderer.drawTile).toHaveBeenCalledWith(
      image,
      0, 0, 32, 32,
      100, 100, 32, 32
    );
  });

  it('should advance animation frame on update', () => {
    spriteRenderer.update(100); // Advance 1 frame
    spriteRenderer.render(renderer, 100, 100);
    // Frame 1: (32,0)
    expect(renderer.drawTile).toHaveBeenCalledWith(
      image,
      32, 0, 32, 32,
      100, 100, 32, 32
    );
  });

  it('should loop animation', () => {
    spriteRenderer.update(100); // Frame 1
    spriteRenderer.update(100); // Frame 0 (loop)
    spriteRenderer.render(renderer, 100, 100);
    expect(renderer.drawTile).toHaveBeenCalledWith(
      image,
      0, 0, 32, 32,
      100, 100, 32, 32
    );
  });

  it('should change animation', () => {
    spriteRenderer.setAnimation('walk');
    spriteRenderer.render(renderer, 100, 100);
    // Frame 2: (0,32)
    expect(renderer.drawTile).toHaveBeenCalledWith(
      image,
      0, 32, 32, 32,
      100, 100, 32, 32
    );
  });
});
