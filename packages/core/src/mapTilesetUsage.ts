import type { Map } from '@packages/types';
import { resolveMapTilesetIds } from './resolveTileset';
import { decodeTileRef } from './tileRef';

/**
 * Whether a map depends on a tileset for authoring or painted cells.
 *
 * The default tileset (index 0) is always a usage, even on an empty map.
 * Extra tilesets only count when at least one cell still encodes their index.
 */
export function mapUsesTileset(
  map: Pick<Map, 'tilesetId' | 'tilesetIds' | 'layers'>,
  assetId: string,
): boolean {
  if (!assetId) return false;

  const ids = resolveMapTilesetIds(map);
  const index = ids.indexOf(assetId);
  if (index < 0) return false;
  if (index === 0) return true;

  return map.layers.some((layer) =>
    layer.data.some((value) => decodeTileRef(value)?.tilesetIndex === index),
  );
}
