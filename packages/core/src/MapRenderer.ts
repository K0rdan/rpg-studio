import type { Map, Tileset } from '@packages/types';
import { Renderer } from './Renderer';

export class MapRenderer {
  private map: Map;
  private tileset: Tileset;
  private tilesetImage: HTMLImageElement;
  private destTileWidth: number;
  private destTileHeight: number;

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

  public render(renderer: Renderer) {
    const srcTileWidth = this.tileset.tile_width;
    const srcTileHeight = this.tileset.tile_height;
    const mapWidth = this.map.width; // in tiles

    // Calculate columns in tileset image
    const cols = Math.floor(this.tilesetImage.width / srcTileWidth);

    for (const layer of this.map.layers) {
      for (let i = 0; i < layer.data.length; i++) {
        const tileIndex = layer.data[i];
        if (tileIndex === -1) continue; // Empty tile

        const x = (i % mapWidth) * this.destTileWidth;
        const y = Math.floor(i / mapWidth) * this.destTileHeight;

        // Calculate source position
        const sx = (tileIndex % cols) * srcTileWidth;
        const sy = Math.floor(tileIndex / cols) * srcTileHeight;

        renderer.drawTile(
          this.tilesetImage,
          sx, sy, srcTileWidth, srcTileHeight,
          x, y, this.destTileWidth, this.destTileHeight
        );
      }
    }
  }
}
