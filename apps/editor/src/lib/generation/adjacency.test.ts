import {
  TILE_FAMILY_CATEGORIES,
  type TileFamilyCategory,
} from '@packages/types';

import { areCategoriesCommonlyAdjacent } from './adjacency';

const PROACTIVE_PAIRS: Array<[TileFamilyCategory, TileFamilyCategory]> = [
  ['ground', 'ground'],
  ['ground', 'water'],
  ['water', 'ground'],
  ['ground', 'vegetation'],
  ['ground', 'elevation'],
  ['water', 'water'],
  ['vegetation', 'vegetation'],
  ['elevation', 'elevation'],
  ['structure', 'ground'],
];

const NEVER_PROACTIVE: Array<[TileFamilyCategory, TileFamilyCategory]> = [
  ['decoration', 'ground'],
  ['decoration', 'water'],
  ['decoration', 'elevation'],
  ['decoration', 'vegetation'],
  ['decoration', 'structure'],
  ['decoration', 'decoration'],
  ['structure', 'water'],
  ['structure', 'elevation'],
  ['structure', 'vegetation'],
  ['structure', 'structure'],
];

describe('areCategoriesCommonlyAdjacent', () => {
  it.each(PROACTIVE_PAIRS)(
    'treats %s and %s as commonly adjacent',
    (left, right) => {
      expect(areCategoriesCommonlyAdjacent(left, right)).toBe(true);
    },
  );

  it.each(NEVER_PROACTIVE)(
    'does not proactively pair %s with %s',
    (left, right) => {
      expect(areCategoriesCommonlyAdjacent(left, right)).toBe(false);
    },
  );

  it('covers every controlled category without treating decoration as adjacent', () => {
    expect(TILE_FAMILY_CATEGORIES).toContain('decoration');
    for (const category of TILE_FAMILY_CATEGORIES) {
      expect(areCategoriesCommonlyAdjacent('decoration', category)).toBe(false);
    }
  });
});
