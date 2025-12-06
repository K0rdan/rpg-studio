import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameLoop } from './GameLoop';

describe('GameLoop', () => {
  let gameLoop: GameLoop;
  let callback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    callback = vi.fn();
    gameLoop = new GameLoop(callback as any);
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not run callback before start', () => {
    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should run callback after start', () => {
    gameLoop.start();
    vi.advanceTimersByTime(20); // Advance enough for one frame
    expect(callback).toHaveBeenCalled();
  });

  it('should stop running callback after stop', () => {
    gameLoop.start();
    vi.advanceTimersByTime(20);
    expect(callback).toHaveBeenCalled();
    
    callback.mockClear();
    gameLoop.stop();
    vi.advanceTimersByTime(20);
    expect(callback).not.toHaveBeenCalled();
  });
});
