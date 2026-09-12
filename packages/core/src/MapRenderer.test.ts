
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
      setAlpha: vi.fn(),
    } as unknown as Renderer;

    map = {
      id: '1',
      name: 'Test Map',
      width: 2,
      height: 2,
      tilesetId: 'ts1',
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

  it('renders visible layers from lowest to highest', () => {
    map.layers = [
      { name: 'Ground', data: [0, -1, -1, -1] },
      { name: 'Objects', data: [1, -1, -1, -1] },
    ];
    mapRenderer.updateMapData(map);

    mapRenderer.render(renderer);

    expect(renderer.drawTile).toHaveBeenCalledTimes(2);
    expect(renderer.drawTile).toHaveBeenNthCalledWith(
      1,
      image,
      0, 0, 32, 32,
      0, 0, 32, 32,
    );
    expect(renderer.drawTile).toHaveBeenNthCalledWith(
      2,
      image,
      32, 0, 32, 32,
      0, 0, 32, 32,
    );
  });

  it('renders only layers in the requested priority pass', () => {
    map.layers = [
      { name: 'Legacy ground', data: [0, -1, -1, -1] },
      { name: 'Same', data: [1, -1, -1, -1], priority: 'same' },
      { name: 'Above', data: [2, -1, -1, -1], priority: 'above' },
    ];
    mapRenderer.updateMapData(map);

    mapRenderer.renderPriority(renderer, 'above');

    expect(renderer.drawTile).toHaveBeenCalledTimes(1);
    expect(renderer.drawTile).toHaveBeenCalledWith(
      image,
      0, 32, 32, 32,
      0, 0, 32, 32,
    );
  });

  it('creates one same-depth render item per non-empty tile row', () => {
    map.layers = [
      { name: 'Same', data: [0, -1, -1, 1], priority: 'same' },
    ];
    mapRenderer.updateMapData(map);

    const items = mapRenderer.createSameDepthItems(renderer);

    expect(items.map(({ depth }) => depth)).toEqual([32, 64]);
    items[1].render();
    expect(renderer.drawTile).toHaveBeenCalledTimes(1);
    expect(renderer.drawTile).toHaveBeenCalledWith(
      image,
      32, 0, 32, 32,
      32, 32, 32, 32,
    );
  });

  it('skips hidden layers and treats missing visibility as visible', () => {
    map.layers = [
      { name: 'Legacy', data: [0, -1, -1, -1] },
      { name: 'Hidden', data: [1, -1, -1, -1], visible: false },
    ];
    mapRenderer.updateMapData(map);

    mapRenderer.render(renderer);

    expect(renderer.drawTile).toHaveBeenCalledTimes(1);
    expect(renderer.drawTile).toHaveBeenCalledWith(
      image,
      0, 0, 32, 32,
      0, 0, 32, 32,
    );
  });

  it('dims inactive visible layers when view options are set', () => {
    map.layers = [
      { name: 'Ground', data: [0, -1, -1, -1] },
      { name: 'Objects', data: [1, -1, -1, -1] },
    ];
    mapRenderer.updateMapData(map);
    mapRenderer.setViewOptions({
      focusLayerIndex: 1,
      isolate: false,
      inactiveOpacity: 0.28,
    });

    mapRenderer.render(renderer);

    expect(renderer.setAlpha).toHaveBeenCalledWith(0.28);
    expect(renderer.setAlpha).toHaveBeenCalledWith(1);
    expect(renderer.drawTile).toHaveBeenCalledTimes(2);
  });

  it('does not dim when only one layer is visible', () => {
    map.layers = [
      { name: 'Ground', data: [0, -1, -1, -1] },
      { name: 'Hidden', data: [1, -1, -1, -1], visible: false },
    ];
    mapRenderer.updateMapData(map);
    mapRenderer.setViewOptions({
      focusLayerIndex: 0,
      isolate: false,
      inactiveOpacity: 0.28,
    });

    mapRenderer.render(renderer);

    expect(renderer.setAlpha).toHaveBeenCalledWith(1);
    expect(renderer.setAlpha).not.toHaveBeenCalledWith(0.28);
    expect(renderer.drawTile).toHaveBeenCalledTimes(1);
  });

  it('draws only the focused layer while isolate is on', () => {
    map.layers = [
      { name: 'Ground', data: [0, -1, -1, -1] },
      { name: 'Objects', data: [1, -1, -1, -1] },
    ];
    mapRenderer.updateMapData(map);
    mapRenderer.setViewOptions({
      focusLayerIndex: 1,
      isolate: true,
      inactiveOpacity: 0.28,
    });

    mapRenderer.render(renderer);

    expect(renderer.drawTile).toHaveBeenCalledTimes(1);
    expect(renderer.drawTile).toHaveBeenCalledWith(
      image,
      32, 0, 32, 32,
      0, 0, 32, 32,
    );
    expect(renderer.setAlpha).not.toHaveBeenCalledWith(0.28);
  });

  it('shows a hidden layer when it is isolated', () => {
    map.layers = [
      { name: 'Ground', data: [0, -1, -1, -1] },
      { name: 'Hidden', data: [1, -1, -1, -1], visible: false },
    ];
    mapRenderer.updateMapData(map);
    mapRenderer.setViewOptions({
      focusLayerIndex: 1,
      isolate: true,
      inactiveOpacity: 0.28,
    });

    mapRenderer.render(renderer);

    expect(renderer.drawTile).toHaveBeenCalledTimes(1);
    expect(renderer.drawTile).toHaveBeenCalledWith(
      image,
      32, 0, 32, 32,
      0, 0, 32, 32,
    );
  });

  it('restores full-strength rendering when view options are cleared', () => {
    map.layers = [
      { name: 'Ground', data: [0, -1, -1, -1] },
      { name: 'Objects', data: [1, -1, -1, -1] },
    ];
    mapRenderer.updateMapData(map);
    mapRenderer.setViewOptions({
      focusLayerIndex: 1,
      isolate: false,
      inactiveOpacity: 0.28,
    });
    mapRenderer.setViewOptions(null);

    mapRenderer.render(renderer);

    expect(renderer.setAlpha).not.toHaveBeenCalledWith(0.28);
    expect(renderer.drawTile).toHaveBeenCalledTimes(2);
  });
});
