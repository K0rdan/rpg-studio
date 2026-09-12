// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { PlayerController } from './PlayerController';
import type { Entity, Layer, Map, Tileset } from '@packages/types';
import { DEFAULT_PLAYER_PROPERTIES } from '@packages/types';
import { InputManager } from './InputManager';
import type { Renderer } from './Renderer';
import type { SpriteRenderer } from './SpriteRenderer';

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

const WALL = 7;
const FLOOR = 3;

/** 3x3 layer data with `WALL` at the given cells and `FLOOR` everywhere else. */
function floorWithWalls(...walls: Array<[number, number]>): number[] {
  const data = new Array<number>(9).fill(FLOOR);
  walls.forEach(([x, y]) => {
    data[y * 3 + x] = WALL;
  });
  return data;
}

function makeCollisionMap(layers: Array<Partial<Layer>>): Map {
  return {
    id: 'map-1',
    name: 'Test Map',
    width: 3,
    height: 3,
    tilesetId: 'tileset-1',
    layers: layers.map((layer, index) => ({
      name: `Layer ${index + 1}`,
      data: floorWithWalls(),
      ...layer,
    })),
  };
}

function makeCollisionTileset(overrides: Partial<Tileset> = {}): Tileset {
  return {
    id: 'tileset-1',
    name: 'Test Tileset',
    image_source: '/tileset.png',
    tile_width: TILE_W,
    tile_height: TILE_H,
    tiles: [{ id: WALL, is_collidable: true }],
    ...overrides,
  };
}

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

  // -----------------------------------------------------------------------
  // Animation switching
  // -----------------------------------------------------------------------
  describe('animation switching via SpriteRenderer', () => {
    /** Tracks setAnimation calls on a mock sprite renderer */
    class MockSpriteRenderer {
      public lastAnimation: string = 'idle';
      setAnimation(name: string) { this.lastAnimation = name; }
      update(_dt: number) {}
      render() {}
    }

    it('sets walk_down when ArrowDown is held', () => {
      const controller = new PlayerController(makePlayerEntity(), TILE_W, TILE_H);
      const sr = new MockSpriteRenderer() as any;
      controller.setSpriteRenderer(sr);
      const input = new MockInputManager();
      input.pressKey('ArrowDown');
      controller.update(16, input);
      expect(sr.lastAnimation).toBe('walk_down');
    });

    it('sets walk_up when ArrowUp is held', () => {
      const controller = new PlayerController(makePlayerEntity(), TILE_W, TILE_H);
      const sr = new MockSpriteRenderer() as any;
      controller.setSpriteRenderer(sr);
      const input = new MockInputManager();
      input.pressKey('ArrowUp');
      controller.update(16, input);
      expect(sr.lastAnimation).toBe('walk_up');
    });

    it('sets walk_right when ArrowRight is held', () => {
      const controller = new PlayerController(makePlayerEntity(), TILE_W, TILE_H);
      const sr = new MockSpriteRenderer() as any;
      controller.setSpriteRenderer(sr);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');
      controller.update(16, input);
      expect(sr.lastAnimation).toBe('walk_right');
    });

    it('sets walk_left when ArrowLeft is held', () => {
      const controller = new PlayerController(makePlayerEntity(), TILE_W, TILE_H);
      const sr = new MockSpriteRenderer() as any;
      controller.setSpriteRenderer(sr);
      const input = new MockInputManager();
      input.pressKey('ArrowLeft');
      controller.update(16, input);
      expect(sr.lastAnimation).toBe('walk_left');
    });

    it('sets idle when no keys are held', () => {
      const controller = new PlayerController(makePlayerEntity(), TILE_W, TILE_H);
      const sr = new MockSpriteRenderer() as any;
      sr.lastAnimation = 'walk_down'; // pre-set to a non-idle state
      controller.setSpriteRenderer(sr);
      const input = new MockInputManager();
      // no keys pressed
      controller.update(16, input);
      expect(sr.lastAnimation).toBe('idle');
    });

    it('does not throw when no SpriteRenderer is set', () => {
      const controller = new PlayerController(makePlayerEntity(), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowDown');
      expect(() => controller.update(16, input)).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Terrain collision
  // -----------------------------------------------------------------------
  describe('terrain collision', () => {
    /**
     * A blocked step is refused, not clamped, so the player comes to rest up to
     * one frame of travel short of the last walkable position (2 on a 3x3 map).
     */
    function expectStoppedAtLastColumn(value: number) {
      expect(value).toBeGreaterThan(1.9);
      expect(value).toBeLessThanOrEqual(2);
    }

    /** Runs 100 frames at 60fps so movement is resolved per frame, not in one jump. */
    function walk(controller: PlayerController, input: InputManager, collision?: { map: Map; tileset: Tileset | null }) {
      for (let frame = 0; frame < 100; frame += 1) {
        controller.update(16, input, collision);
      }
    }

    it('stops the player at a blocking tile on a below layer', () => {
      const controller = new PlayerController(makePlayerEntity({ x: 0, y: 0 }), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');

      walk(controller, input, {
        map: makeCollisionMap([{ data: floorWithWalls([1, 0]) }]),
        tileset: makeCollisionTileset(),
      });

      expect(controller.getPosition().x).toBe(0);
    });

    it('walks across floor tiles that carry no blocking mark', () => {
      const controller = new PlayerController(makePlayerEntity({ x: 0, y: 0 }), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');

      walk(controller, input, {
        map: makeCollisionMap([{ data: floorWithWalls() }]),
        tileset: makeCollisionTileset(),
      });

      // Free to cross the map, but the 1x1 player cannot pass the last column.
      expectStoppedAtLastColumn(controller.getPosition().x);
    });

    it('blocks when any stacked below layer marks the cell', () => {
      const controller = new PlayerController(makePlayerEntity({ x: 0, y: 0 }), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');

      walk(controller, input, {
        map: makeCollisionMap([
          { data: floorWithWalls() },
          { data: floorWithWalls([1, 0]) },
        ]),
        tileset: makeCollisionTileset(),
      });

      expect(controller.getPosition().x).toBe(0);
    });

    it('refuses to leave the map at its far edge', () => {
      const controller = new PlayerController(makePlayerEntity({ x: 2, y: 2 }), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');
      input.pressKey('ArrowDown');

      walk(controller, input, {
        map: makeCollisionMap([{ data: floorWithWalls() }]),
        tileset: makeCollisionTileset(),
      });

      expect(controller.getPosition()).toEqual({ x: 2, y: 2 });
    });

    it('slides along the free axis when a diagonal move is blocked on X', () => {
      const controller = new PlayerController(makePlayerEntity({ x: 0, y: 0 }), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');
      input.pressKey('ArrowDown');

      walk(controller, input, {
        map: makeCollisionMap([{ data: floorWithWalls([1, 0], [1, 1], [1, 2]) }]),
        tileset: makeCollisionTileset(),
      });

      const { x, y } = controller.getPosition();
      expect(x).toBe(0);
      expectStoppedAtLastColumn(y);
    });

    it('slides along the free axis when a diagonal move is blocked on Y', () => {
      const controller = new PlayerController(makePlayerEntity({ x: 0, y: 0 }), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');
      input.pressKey('ArrowDown');

      walk(controller, input, {
        map: makeCollisionMap([{ data: floorWithWalls([0, 1], [1, 1], [2, 1]) }]),
        tileset: makeCollisionTileset(),
      });

      const { x, y } = controller.getPosition();
      expectStoppedAtLastColumn(x);
      expect(y).toBe(0);
    });

    it('lets a player standing on a blocking cell walk out of it', () => {
      const controller = new PlayerController(makePlayerEntity({ x: 1, y: 1 }), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');

      walk(controller, input, {
        map: makeCollisionMap([{ data: floorWithWalls([1, 1]) }]),
        tileset: makeCollisionTileset(),
      });

      expectStoppedAtLastColumn(controller.getPosition().x);
    });

    it('walks through blocking tiles painted only on same-depth or above layers', () => {
      const controller = new PlayerController(makePlayerEntity({ x: 0, y: 0 }), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');

      walk(controller, input, {
        map: makeCollisionMap([
          { data: floorWithWalls([1, 0]), priority: 'same' },
          { data: floorWithWalls([2, 0]), priority: 'above' },
        ]),
        tileset: makeCollisionTileset(),
      });

      expectStoppedAtLastColumn(controller.getPosition().x);
    });

    it('walks through blocking tiles on hidden below layers', () => {
      const controller = new PlayerController(makePlayerEntity({ x: 0, y: 0 }), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');

      walk(controller, input, {
        map: makeCollisionMap([{ data: floorWithWalls([1, 0]), visible: false }]),
        tileset: makeCollisionTileset(),
      });

      expectStoppedAtLastColumn(controller.getPosition().x);
    });

    it('stays walkable when the tileset carries no blocking marks', () => {
      const controller = new PlayerController(makePlayerEntity({ x: 0, y: 0 }), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');

      walk(controller, input, {
        map: makeCollisionMap([{ data: floorWithWalls([1, 0]) }]),
        tileset: makeCollisionTileset({ tiles: undefined }),
      });

      expectStoppedAtLastColumn(controller.getPosition().x);
    });

    it('moves freely when no collision context is provided', () => {
      const controller = new PlayerController(makePlayerEntity({ x: 0, y: 0 }), TILE_W, TILE_H);
      const input = new MockInputManager();
      input.pressKey('ArrowRight');

      walk(controller, input);

      expect(controller.getPosition().x).toBeCloseTo(6.4, 1);
    });
  });

  it('normalizes a charset to one map tile when rendering', () => {
    const controller = new PlayerController(
      makePlayerEntity({ x: 2, y: 3 }),
      TILE_W,
      TILE_H,
    );
    const spriteRenderer = {
      render: vi.fn(),
    } as unknown as SpriteRenderer;
    const renderer = {} as Renderer;
    controller.setSpriteRenderer(spriteRenderer);

    controller.render(renderer);

    expect(spriteRenderer.render).toHaveBeenCalledWith(
      renderer,
      2 * TILE_W,
      3 * TILE_H,
      TILE_W,
      TILE_H,
    );
  });

  it('uses the sprite bottom edge as its render depth', () => {
    const controller = new PlayerController(
      makePlayerEntity({ y: 3 }),
      TILE_W,
      TILE_H,
    );

    expect(controller.getRenderDepth()).toBe(4 * TILE_H);
  });
});
