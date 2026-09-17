/** Layer data value for a cell with no tile painted on it. */
export const EMPTY_TILE = -1;

const LOCAL_ID_MASK = 0xffff;
const TILESET_INDEX_SHIFT = 16;

export interface DecodedTileRef {
  tilesetIndex: number;
  localId: number;
}

/**
 * Pack a tileset list index and a local tile id into a single layer-data number.
 *
 * Index 0 encodes as the local id alone, so maps stored before multi-tileset
 * support keep their existing `0..N` values.
 */
export function encodeTileRef(tilesetIndex: number, localId: number): number {
  if (
    !Number.isInteger(tilesetIndex) ||
    tilesetIndex < 0 ||
    tilesetIndex > LOCAL_ID_MASK
  ) {
    throw new RangeError(`tilesetIndex must be an integer between 0 and ${LOCAL_ID_MASK}`);
  }
  if (!Number.isInteger(localId) || localId < 0 || localId > LOCAL_ID_MASK) {
    throw new RangeError(`localId must be an integer between 0 and ${LOCAL_ID_MASK}`);
  }

  return (
    (tilesetIndex << TILESET_INDEX_SHIFT) |
    localId
  ) >>> 0;
}

/** Split a layer-data value. Empty cells return `null`. */
export function decodeTileRef(value: number): DecodedTileRef | null {
  if (value === EMPTY_TILE) return null;

  return {
    tilesetIndex: (value >>> TILESET_INDEX_SHIFT) & LOCAL_ID_MASK,
    localId: value & LOCAL_ID_MASK,
  };
}
