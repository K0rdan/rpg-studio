import type { Layer, Map } from '@packages/types';
import { resolveMapTilesetIds } from '@packages/core';

export interface MapSavePayload {
  layers: Layer[];
  width: number;
  height: number;
  tilesetId: string;
  tilesetIds: string[];
}

/**
 * Fields a map save must ship.
 *
 * `tilesetIds` is mandatory: painted cells store an index into that list, so a
 * save without it leaves every tile of a newly painted tileset pointing at a
 * tileset the preview and the player never load.
 */
export function mapSavePayload(map: Map): MapSavePayload {
  const tilesetIds = resolveMapTilesetIds(map);

  return {
    layers: map.layers,
    width: map.width,
    height: map.height,
    tilesetId: tilesetIds[0] ?? '',
    tilesetIds,
  };
}
