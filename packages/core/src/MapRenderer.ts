import type {
  Layer,
  LayerRenderPriority,
  Map,
  Tileset,
} from '@packages/types';
import { Renderer } from './Renderer';
import type { DepthRenderItem } from './renderDepth';

export interface MapViewOptions {
  focusLayerIndex: number;
  isolate: boolean;
  inactiveOpacity: number;
}

export type LayerDrawMode = 'skip' | 'full' | 'subdued';

export function resolveLayerRenderPriority(layer: Pick<Layer, 'priority'>): LayerRenderPriority {
  return layer.priority ?? 'below';
}

export function resolveLayerDrawMode(
  layers: Array<Pick<Layer, 'visible'>>,
  layerIndex: number,
  options?: MapViewOptions | null,
): LayerDrawMode {
  const layer = layers[layerIndex];
  if (!layer) return 'skip';

  if (!options) {
    return layer.visible === false ? 'skip' : 'full';
  }

  if (options.isolate) {
    return layerIndex === options.focusLayerIndex ? 'full' : 'skip';
  }

  if (layer.visible === false) return 'skip';

  const visibleCount = layers.filter((item) => item.visible !== false).length;
  const activeLayer = layers[options.focusLayerIndex];
  const activeIsVisible = activeLayer?.visible !== false;

  if (layerIndex === options.focusLayerIndex) return 'full';
  if (activeIsVisible && visibleCount >= 2) return 'subdued';
  return 'full';
}

export class MapRenderer {
  private map: Map;
  private tileset: Tileset;
  private tilesetImage: HTMLImageElement;
  private destTileWidth: number;
  private destTileHeight: number;
  private viewOptions: MapViewOptions | null = null;

  constructor(
    map: Map, 
    tileset: Tileset, 
    tilesetImage: HTMLImageElement,
    destTileWidth?: number,
    destTileHeight?: number
  ) {
    this.map = map;
    this.tileset = tileset;
    this.tilesetImage = tilesetImage;
    this.destTileWidth = destTileWidth || tileset.tile_width;
    this.destTileHeight = destTileHeight || tileset.tile_height;
  }

  public setViewOptions(options: MapViewOptions | null): void {
    this.viewOptions = options;
  }

  public render(renderer: Renderer) {
    this.renderPriority(renderer, 'below');
    this.renderPriority(renderer, 'same');
    this.renderPriority(renderer, 'above');
  }

  public renderPriority(renderer: Renderer, priority: LayerRenderPriority): void {
    for (let layerIndex = 0; layerIndex < this.map.layers.length; layerIndex += 1) {
      const layer = this.map.layers[layerIndex];
      if (resolveLayerRenderPriority(layer) !== priority) continue;

      this.renderLayerRange(renderer, layerIndex, 0, layer.data.length);
    }
    renderer.setAlpha(1);
  }

  public createSameDepthItems(renderer: Renderer): DepthRenderItem[] {
    const items: DepthRenderItem[] = [];

    for (let row = 0; row < this.map.height; row += 1) {
      if (!this.hasDrawableSameDepthTile(row)) continue;

      items.push({
        id: `tile-row-${row}`,
        depth: (row + 1) * this.destTileHeight,
        kind: 'tile-row',
        order: row,
        render: () => {
          const start = row * this.map.width;
          const end = start + this.map.width;

          for (let layerIndex = 0; layerIndex < this.map.layers.length; layerIndex += 1) {
            const layer = this.map.layers[layerIndex];
            if (resolveLayerRenderPriority(layer) !== 'same') continue;
            this.renderLayerRange(renderer, layerIndex, start, end);
          }
          renderer.setAlpha(1);
        },
      });
    }

    return items;
  }

  /**
   * Update map data without reinitializing the renderer
   * Useful for real-time editing
   */
  public updateMapData(map: Map): void {
    this.map = map;
  }

  private hasDrawableSameDepthTile(row: number): boolean {
    const start = row * this.map.width;
    const end = start + this.map.width;

    return this.map.layers.some((layer, layerIndex) => {
      if (resolveLayerRenderPriority(layer) !== 'same') return false;
      if (resolveLayerDrawMode(this.map.layers, layerIndex, this.viewOptions) === 'skip') {
        return false;
      }
      return layer.data.slice(start, end).some((tileIndex) => tileIndex !== -1);
    });
  }

  private renderLayerRange(
    renderer: Renderer,
    layerIndex: number,
    start: number,
    end: number,
  ): void {
    const layer = this.map.layers[layerIndex];
    if (!layer) return;

    const mode = resolveLayerDrawMode(this.map.layers, layerIndex, this.viewOptions);
    switch (mode) {
      case 'skip':
        return;
      case 'full':
        renderer.setAlpha(1);
        break;
      case 'subdued':
        renderer.setAlpha(this.viewOptions?.inactiveOpacity ?? 1);
        break;
      default: {
        const _exhaustive: never = mode;
        throw new Error(`Unhandled layer draw mode: ${_exhaustive}`);
      }
    }

    const srcTileWidth = this.tileset.source_tile_width || this.tileset.tile_width;
    const srcTileHeight = this.tileset.source_tile_height || this.tileset.tile_height;
    const cols = Math.floor(this.tilesetImage.width / srcTileWidth);

    for (let index = start; index < Math.min(end, layer.data.length); index += 1) {
      const tileIndex = layer.data[index];
      if (tileIndex === -1) continue;

      const x = (index % this.map.width) * this.destTileWidth;
      const y = Math.floor(index / this.map.width) * this.destTileHeight;
      const sx = (tileIndex % cols) * srcTileWidth;
      const sy = Math.floor(tileIndex / cols) * srcTileHeight;

      renderer.drawTile(
        this.tilesetImage,
        sx,
        sy,
        srcTileWidth,
        srcTileHeight,
        x,
        y,
        this.destTileWidth,
        this.destTileHeight,
      );
    }
  }
}
