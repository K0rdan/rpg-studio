import type { Map, Tileset } from '@packages/types';
import { Renderer } from './Renderer';

export class MapRenderer {
  private map: Map;
  private tileset: Tileset;
  private tilesetImage: HTMLImageElement;

  constructor(map: Map, tileset: Tileset, tilesetImage: HTMLImageElement) {
    this.map = map;
    this.tileset = tileset;
    this.tilesetImage = tilesetImage;
  }

  public render(renderer: Renderer) {
    const tileWidth = this.tileset.tile_width;
    const tileHeight = this.tileset.tile_height;
    const mapWidth = this.map.width; // in tiles

    // Calculate columns in tileset image
    const cols = Math.floor(this.tilesetImage.width / tileWidth);

    for (const layer of this.map.layers) {
      for (let i = 0; i < layer.data.length; i++) {
        const tileIndex = layer.data[i];
        if (tileIndex === -1) continue; // Empty tile

        const x = (i % mapWidth) * tileWidth;
        const y = Math.floor(i / mapWidth) * tileHeight;

        // Calculate source position
        const sx = (tileIndex % cols) * tileWidth;
        const sy = Math.floor(tileIndex / cols) * tileHeight;

        renderer.drawTile(
          this.tilesetImage,
          sx, sy, tileWidth, tileHeight,
          x, y, tileWidth, tileHeight
        );
      }
    }
  }
}
