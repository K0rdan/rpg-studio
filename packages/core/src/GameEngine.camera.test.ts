import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from './GameEngine';

describe('GameEngine camera', () => {
  let frame: FrameRequestCallback | null;
  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;

  beforeEach(() => {
    frame = null;
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('performance', { now: () => 0 });
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    canvas = {
      width: 800,
      height: 600,
      getContext: vi.fn(),
    } as unknown as HTMLCanvasElement;
    context = {
      canvas,
      resetTransform: vi.fn(),
      clearRect: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      globalCompositeOperation: 'source-over',
      globalAlpha: 1,
      imageSmoothingEnabled: true,
    } as unknown as CanvasRenderingContext2D;
    vi.mocked(canvas.getContext).mockReturnValue(context);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('applies camera changes on the next frame without reconstruction', () => {
    const engine = new GameEngine(canvas, {
      scale: 1,
      enablePlayerControls: false,
    });
    engine.setCamera({ zoom: 2, offsetX: 15, offsetY: -10 });
    engine.start();

    expect(frame).not.toBeNull();
    frame?.(16);

    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 15, -10);
  });

  it('resizes the same canvas and ignores invalid sizes', () => {
    const engine = new GameEngine(canvas, { scale: 1 });

    engine.setCanvasSize(1024, 768);
    engine.setCanvasSize(0, -1);

    expect(canvas.width).toBe(1024);
    expect(canvas.height).toBe(768);
  });
});
