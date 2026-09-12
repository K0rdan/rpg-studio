import type { Map, Tileset } from '@packages/types';

/**
 * Last-resort tileset, used only when no tileset at all is available.
 *
 * `source_tile_*` MUST match the real tile grid of the bundled image: MapRenderer
 * derives the tileset column count from it, so a wrong value makes every tile
 * index resolve to a fragment of the wrong tile.
 */
export const FALLBACK_TILESET: Tileset = {
  id: 'fallback-tileset',
  name: 'Fixed Tileset',
  image_source: '/tileset_fixed.png',
  tile_width: 32,
  tile_height: 32,
  source_tile_width: 128,
  source_tile_height: 128,
};

/**
 * A tileset is only usable if it carries an image the loader can actually fetch.
 *
 * The tileset APIs keep returning metadata with a blank `image_source` when the
 * storage backend cannot sign a URL, so the type saying `string` is not enough.
 */
function hasUsableImage(tileset: Tileset | undefined): tileset is Tileset {
  return typeof tileset?.image_source === 'string' && tileset.image_source.trim() !== '';
}

/**
 * Resolve the tileset a map paints with.
 *
 * Maps created without picking a tileset have an empty `tilesetId`, so prefer the
 * first available tileset over the hardcoded fallback — the tile palette shows
 * that same tileset, and both sides must agree on the tile grid.
 *
 * Tilesets whose image is missing are skipped rather than returned: rendering the
 * fallback grid beats handing the loader a URL that can never resolve.
 */
export function resolveMapTileset(
  map: Pick<Map, 'tilesetId'> | null | undefined,
  tilesets: Tileset[] = []
): Tileset {
  const byId = map?.tilesetId
    ? tilesets.find((tileset) => tileset.id === map.tilesetId)
    : undefined;

  if (hasUsableImage(byId)) {
    return byId;
  }

  return tilesets.find((tileset) => hasUsableImage(tileset)) ?? FALLBACK_TILESET;
}
