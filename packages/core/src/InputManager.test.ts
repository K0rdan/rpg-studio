// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputManager } from './InputManager';

describe('InputManager', () => {
  let inputManager: InputManager;
  let listeners: Record<string, (event: any) => void> = {};

  beforeEach(() => {
    // Mock window.addEventListener
    listeners = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      listeners[event] = handler as (event: any) => void;
    });
    vi.spyOn(window, 'removeEventListener');

    inputManager = new InputManager();
  });

  afterEach(() => {
    inputManager.destroy();
    vi.restoreAllMocks();
  });

  it('should track key presses', () => {
    expect(inputManager.isKeyDown('ArrowUp')).toBe(false);

    // Simulate keydown
    listeners['keydown']({ key: 'ArrowUp' });
    expect(inputManager.isKeyDown('ArrowUp')).toBe(true);

    // Simulate keyup
    listeners['keyup']({ key: 'ArrowUp' });
    expect(inputManager.isKeyDown('ArrowUp')).toBe(false);
  });

  it('should handle multiple keys', () => {
    listeners['keydown']({ key: 'ArrowUp' });
    listeners['keydown']({ key: 'ArrowRight' });

    expect(inputManager.isKeyDown('ArrowUp')).toBe(true);
    expect(inputManager.isKeyDown('ArrowRight')).toBe(true);
    expect(inputManager.isKeyDown('ArrowDown')).toBe(false);
  });
});
