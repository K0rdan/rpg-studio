
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapRenderer } from './MapRenderer';
import type { Map, Tileset } from '@packages/types';
import { Renderer } from './Renderer';

describe('MapRenderer', () => {
  let mapRenderer: MapRenderer;
  let renderer: Renderer;
  let map: Map;
  let tileset: Tileset;
  let image: HTMLImageElement;

  beforeEach(() => {
    renderer = {
      drawTile: vi.fn(),
    } as unknown as Renderer;

    map = {
      id: '1',
      name: 'Test Map',
      width: 2,
      height: 2,
      layers: [
        {
          name: 'Layer 1',
          data: [0, 1, -1, 2], // 2x2 map
        },
      ],
    };

    tileset = {
      id: 'ts1',
      name: 'Test Tileset',
      image_source: 'tiles.png',
      tile_width: 32,
      tile_height: 32,
    };

    image = {
      width: 64, // 2 cols
      height: 64,
    } as unknown as HTMLImageElement;

    mapRenderer = new MapRenderer(map, tileset, image);
  });

  it('should render tiles correctly', () => {
    mapRenderer.render(renderer);

    // Tile 0: (0,0) -> (0,0)
    expect(renderer.drawTile).toHaveBeenCalledWith(
      image,
      0, 0, 32, 32,
      0, 0, 32, 32
    );

    // Tile 1: (32,0) -> (32,0)
    expect(renderer.drawTile).toHaveBeenCalledWith(
      image,
      32, 0, 32, 32,
      32, 0, 32, 32
    );

    // Tile -1: Skipped
    // Tile 2: (0,32) -> (32,32)
    expect(renderer.drawTile).toHaveBeenCalledWith(
      image,
      0, 32, 32, 32,
      32, 32, 32, 32
    );
  });
});
