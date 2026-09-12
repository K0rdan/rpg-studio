import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpriteRenderer } from './SpriteRenderer';
import {
  DEFAULT_CHARSET_ANIMATIONS,
  type Sprite,
} from '@packages/types';
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

  it('uses three frames for each of the four default directions', () => {
    expect(DEFAULT_CHARSET_ANIMATIONS).toEqual({
      idle: [1],
      walk_down: [0, 1, 2],
      walk_left: [3, 4, 5],
      walk_right: [6, 7, 8],
      walk_up: [9, 10, 11],
    });
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

  it('slices 48×48 frames and normalizes the destination size', () => {
    const configurableSprite: Sprite = {
      ...sprite,
      frame_width: 48,
      frame_height: 48,
      animations: { idle: [4] },
    };
    const configurableImage = {
      width: 144,
      height: 192,
    } as unknown as HTMLImageElement;
    const configurableRenderer = new SpriteRenderer(configurableSprite, configurableImage);

    configurableRenderer.render(renderer, 64, 96, 32, 32);

    expect(renderer.drawTile).toHaveBeenCalledWith(
      configurableImage,
      48, 48, 48, 48,
      64, 96, 32, 32
    );
  });

  it('slices 96×96 frames independently from the map tile size', () => {
    const configurableSprite: Sprite = {
      ...sprite,
      frame_width: 96,
      frame_height: 96,
      animations: { idle: [7] },
    };
    const configurableImage = {
      width: 288,
      height: 384,
    } as unknown as HTMLImageElement;
    const configurableRenderer = new SpriteRenderer(configurableSprite, configurableImage);

    configurableRenderer.render(renderer, 16, 24, 48, 48);

    expect(renderer.drawTile).toHaveBeenCalledWith(
      configurableImage,
      96, 192, 96, 96,
      16, 24, 48, 48
    );
  });
});
