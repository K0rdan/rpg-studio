import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scene } from './Scene';
import type { Map } from '@packages/types';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';

describe('Scene', () => {
  let scene: Scene;
  let renderer: Renderer;
  let input: InputManager;

  beforeEach(() => {
    scene = new Scene();
    renderer = {
      clear: vi.fn(),
      drawRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as Renderer;
    input = {} as unknown as InputManager;
  });

  it('should load a map', () => {
    const map: Map = {
      id: '1',
      name: 'Test Map',
      width: 10,
      height: 10,
      layers: [],
    };
    scene.loadMap(map);
  });

  it('should update and render without crashing', () => {
    scene.update(16, input);
    scene.render(renderer);
  });
});
