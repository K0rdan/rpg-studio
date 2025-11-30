import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Renderer } from './Renderer';

describe('Renderer', () => {
  let renderer: Renderer;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;

    canvas = {
      getContext: vi.fn().mockReturnValue(ctx),
      width: 800,
      height: 600,
    } as unknown as HTMLCanvasElement;

    renderer = new Renderer(canvas);
  });

  it('should clear the canvas', () => {
    renderer.clear();
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('should draw a rectangle', () => {
    renderer.drawRect(10, 20, 30, 40, 'red');
    expect(ctx.fillStyle).toBe('red');
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 30, 40);
  });

  it('should draw an image', () => {
    const image = {} as CanvasImageSource;
    renderer.drawImage(image, 10, 20);
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 10, 20);
  });
});
