import { describe, it, expect } from 'vitest';
import { EMPTY_TILE, decodeTileRef, encodeTileRef } from './tileRef';

describe('encodeTileRef / decodeTileRef', () => {
  it('encodes tileset 0 as the local id so legacy layer data is unchanged', () => {
    expect(encodeTileRef(0, 7)).toBe(7);
    expect(decodeTileRef(7)).toEqual({ tilesetIndex: 0, localId: 7 });
    expect(decodeTileRef(0)).toEqual({ tilesetIndex: 0, localId: 0 });
  });

  it('packs a non-zero tileset index in the high 16 bits', () => {
    const packed = encodeTileRef(1, 3);

    expect(packed).toBe((1 << 16) | 3);
    expect(decodeTileRef(packed)).toEqual({ tilesetIndex: 1, localId: 3 });
  });

  it('treats EMPTY_TILE as no tile', () => {
    expect(decodeTileRef(EMPTY_TILE)).toBeNull();
  });

  it('keeps the largest packed value distinct from EMPTY_TILE', () => {
    const packed = encodeTileRef(65535, 65535);

    expect(packed).toBe(4294967295);
    expect(decodeTileRef(packed)).toEqual({ tilesetIndex: 65535, localId: 65535 });
  });

  it('rejects values that cannot fit in the packed representation', () => {
    expect(() => encodeTileRef(-1, 0)).toThrow(RangeError);
    expect(() => encodeTileRef(0, 65536)).toThrow(RangeError);
  });
});
