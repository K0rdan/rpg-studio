import { describe, expect, it } from 'vitest';
import { sortDepthItems, type DepthRenderItem } from './renderDepth';

const item = (
  id: string,
  depth: number,
  kind: DepthRenderItem['kind'],
  order: number,
): DepthRenderItem => ({
  id,
  depth,
  kind,
  order,
  render: () => undefined,
});

describe('sortDepthItems', () => {
  it('orders same-depth scenery and actors by their bottom edge', () => {
    const sorted = sortDepthItems([
      item('south-player', 96, 'actor', 0),
      item('scenery', 64, 'tile-row', 0),
      item('north-player', 32, 'actor', 1),
    ]);

    expect(sorted.map(({ id }) => id)).toEqual([
      'north-player',
      'scenery',
      'south-player',
    ]);
  });

  it('draws tile rows before actors at equal depth', () => {
    const sorted = sortDepthItems([
      item('actor', 64, 'actor', 0),
      item('tiles', 64, 'tile-row', 0),
    ]);

    expect(sorted.map(({ id }) => id)).toEqual(['tiles', 'actor']);
  });

  it('uses stable order for items of the same kind and depth', () => {
    const sorted = sortDepthItems([
      item('second', 64, 'actor', 2),
      item('first', 64, 'actor', 1),
    ]);

    expect(sorted.map(({ id }) => id)).toEqual(['first', 'second']);
  });
});
