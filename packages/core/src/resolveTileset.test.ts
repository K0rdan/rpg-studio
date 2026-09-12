import { describe, it, expect } from 'vitest';
import { FALLBACK_TILESET, resolveMapTileset } from './resolveTileset';
import type { Tileset } from '@packages/types';

const makeTileset = (id: string, image_source: string): Tileset => ({
  id,
  name: `Tileset ${id}`,
  image_source,
  tile_width: 32,
  tile_height: 32,
});

describe('resolveMapTileset', () => {
  it('returns the tileset referenced by the map', () => {
    const tilesets = [makeTileset('a', 'a.png'), makeTileset('b', 'b.png')];

    expect(resolveMapTileset({ tilesetId: 'b' }, tilesets).id).toBe('b');
  });

  it('falls back to the first usable tileset when the map has no tilesetId', () => {
    const tilesets = [makeTileset('a', 'a.png'), makeTileset('b', 'b.png')];

    expect(resolveMapTileset({ tilesetId: '' }, tilesets).id).toBe('a');
  });

  it('skips the referenced tileset when its image URL is missing', () => {
    const tilesets = [makeTileset('broken', ''), makeTileset('ok', 'ok.png')];

    expect(resolveMapTileset({ tilesetId: 'broken' }, tilesets).id).toBe('ok');
  });

  it('skips tilesets whose image URL failed to be signed', () => {
    // The tileset APIs answer with a null image_source when storage is unreachable.
    const tilesets = [
      { ...makeTileset('broken', ''), image_source: null as unknown as string },
      makeTileset('ok', 'ok.png'),
    ];

    expect(resolveMapTileset({ tilesetId: '' }, tilesets).id).toBe('ok');
  });

  it('uses the bundled fallback when no tileset has a usable image', () => {
    const tilesets = [makeTileset('broken', '   ')];

    expect(resolveMapTileset({ tilesetId: 'broken' }, tilesets)).toBe(FALLBACK_TILESET);
  });

  it('uses the bundled fallback when there is no tileset at all', () => {
    expect(resolveMapTileset(null)).toBe(FALLBACK_TILESET);
  });
});
