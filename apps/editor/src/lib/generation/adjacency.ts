import type { TileFamilyCategory } from '@packages/types';

const COMMON_ADJACENT_PAIRS = new Set([
  'elevation-elevation',
  'elevation-ground',
  'ground-ground',
  'ground-structure',
  'ground-vegetation',
  'ground-water',
  'vegetation-vegetation',
  'water-water',
]);

export function adjacentPairKey(
  left: TileFamilyCategory,
  right: TileFamilyCategory,
): string {
  return [left, right].sort().join('-');
}

export function areCategoriesCommonlyAdjacent(
  left: TileFamilyCategory,
  right: TileFamilyCategory,
): boolean {
  return COMMON_ADJACENT_PAIRS.has(adjacentPairKey(left, right));
}
