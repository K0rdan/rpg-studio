// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerController } from './PlayerController';
import type { Entity } from '@packages/types';
import { DEFAULT_PLAYER_PROPERTIES } from '@packages/types';
import { InputManager } from './InputManager';

/**
 * A minimal subclass of InputManager that lets tests control which keys
 * are "down" without dispatching real DOM events.
 */
class MockInputManager extends InputManager {
  private keysDown: Set<string> = new Set();

  public pressKey(key: string) {
    this.keysDown.add(key);
  }

  public releaseKey(key: string) {
    this.keysDown.delete(key);
  }

  public override isKeyDown(key: string): boolean {
    return this.keysDown.has(key);
  }
}

function makePlayerEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'player-1',
    name: 'Player',
    type: 'player',
    x: 0,
    y: 0,
    commands: [],
    enabled: true,
    playerProperties: { ...DEFAULT_PLAYER_PROPERTIES },
    ...overrides,
  };
}

const TILE_W = 32;
const TILE_H = 32;

describe('PlayerController', () => {
  describe('speed is data-driven from entity.playerProperties', () => {
    it('uses speed=4 from playerProperties and moves 4 tiles after 1000ms right', () => {
      const entity = makePlayerEntity({ playerProperties: { speed: 4, health: 100, maxHealth: 100 } });
      const controller = new PlayerController(entity, TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');

      controller.update(1000, input);

      expect(controller.getPosition().x).toBeCloseTo(4, 1);
    });

    it('falls back to DEFAULT_PLAYER_PROPERTIES.speed=4 when playerProperties is absent', () => {
      const entity = makePlayerEntity({ playerProperties: undefined });
      const controller = new PlayerController(entity, TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');

      controller.update(1000, input);

      expect(controller.getPosition().x).toBeCloseTo(DEFAULT_PLAYER_PROPERTIES.speed, 1);
    });

    it('speed=8 moves twice as far as speed=4 in the same time', () => {
      const slow = new PlayerController(
        makePlayerEntity({ playerProperties: { speed: 4, health: 100, maxHealth: 100 } }),
        TILE_W, TILE_H
      );
      const fast = new PlayerController(
        makePlayerEntity({ playerProperties: { speed: 8, health: 100, maxHealth: 100 } }),
        TILE_W, TILE_H
      );

      const inputSlow = new MockInputManager();
      const inputFast = new MockInputManager();
      inputSlow.pressKey('ArrowRight');
      inputFast.pressKey('ArrowRight');

      slow.update(1000, inputSlow);
      fast.update(1000, inputFast);

      expect(fast.getPosition().x).toBeCloseTo(slow.getPosition().x * 2, 1);
    });
  });

  describe('frame-accurate movement (brief keypress)', () => {
    it('a single 16ms frame at speed=4 moves ~0.064 tiles — not half the map', () => {
      const entity = makePlayerEntity({ playerProperties: { speed: 4, health: 100, maxHealth: 100 } });
      const controller = new PlayerController(entity, TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');

      controller.update(16, input); // one frame at 60fps

      // 4 / 1000 * 16 = 0.064 tiles
      expect(controller.getPosition().x).toBeCloseTo(0.064, 2);
      expect(controller.getPosition().x).toBeLessThan(0.1);
    });
  });

  describe('diagonal movement normalization', () => {
    it('diagonal speed is not faster than cardinal movement', () => {
      const controller = new PlayerController(makePlayerEntity(), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');
      input.pressKey('ArrowDown');

      controller.update(1000, input);

      const { x, y } = controller.getPosition();
      // Each axis ≈ 4 * 0.707 ≈ 2.83 tiles — less than the 4 tiles of pure cardinal
      expect(x).toBeCloseTo(4 * 0.707, 1);
      expect(y).toBeCloseTo(4 * 0.707, 1);
    });
  });

  describe('boundary clamping', () => {
    it('does not allow moving below 0,0', () => {
      const controller = new PlayerController(makePlayerEntity({ x: 0, y: 0 }), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowLeft');
      input.pressKey('ArrowUp');

      controller.update(5000, input);

      expect(controller.getPosition().x).toBeGreaterThanOrEqual(0);
      expect(controller.getPosition().y).toBeGreaterThanOrEqual(0);
    });
  });
});
