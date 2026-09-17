import {
  assetFolderAncestors,
  listAssetFolders,
  normalizeAssetFolderPath,
} from './assetFolders';

describe('assetFolders', () => {
  it('normalizes folder separators and whitespace', () => {
    expect(normalizeAssetFolderPath(' Grass / Edges// Outer ')).toBe('Grass/Edges/Outer');
    expect(normalizeAssetFolderPath('')).toBe('');
  });

  it('rejects traversal and non-string paths', () => {
    expect(normalizeAssetFolderPath('Grass/../Dirt')).toBeNull();
    expect(normalizeAssetFolderPath(42)).toBeNull();
  });

  it('lists unique sorted folders for one asset kind', () => {
    expect(listAssetFolders({
      tileset: ['Grass/Edges', 'Grass/Edges', ' Dirt '],
      charset: ['Heroes'],
    }, 'tileset')).toEqual(['Dirt', 'Grass/Edges']);
  });

  it('builds all ancestors for a nested folder', () => {
    expect(assetFolderAncestors('Grass/Edges/Outer')).toEqual([
      'Grass',
      'Grass/Edges',
      'Grass/Edges/Outer',
    ]);
  });
});
