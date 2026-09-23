import { TILE_FAMILY_CATEGORIES } from '@packages/types';

import { CATEGORY_MODE, resolveGenerationMode } from './category-config';

describe('resolveGenerationMode', () => {
  it('maps implied categories and requires a choice for the others', () => {
    expect(CATEGORY_MODE.ground).toBe('texture');
    expect(CATEGORY_MODE.water).toBe('texture');
    expect(CATEGORY_MODE.decoration).toBe('prop');
    expect(CATEGORY_MODE.vegetation).toBe('creator-choice');
    expect(CATEGORY_MODE.elevation).toBe('creator-choice');
    expect(CATEGORY_MODE.structure).toBe('creator-choice');
    expect(Object.keys(CATEGORY_MODE).sort()).toEqual([...TILE_FAMILY_CATEGORIES].sort());
  });

  it('always treats transitions as texture', () => {
    expect(resolveGenerationMode({
      stage: 'transition',
      category: 'decoration',
      requested: 'prop',
    })).toEqual({ ok: true, mode: 'texture' });
  });

  it('assigns implied modes and rejects a conflicting client value', () => {
    expect(resolveGenerationMode({
      stage: 'base',
      category: 'ground',
    })).toEqual({ ok: true, mode: 'texture' });
    expect(resolveGenerationMode({
      stage: 'family',
      category: 'decoration',
    })).toEqual({ ok: true, mode: 'prop' });
    expect(resolveGenerationMode({
      stage: 'base',
      category: 'ground',
      requested: 'prop',
    })).toMatchObject({ ok: false });
  });

  it('requires texture or prop for creator-choice categories', () => {
    expect(resolveGenerationMode({
      stage: 'base',
      category: 'vegetation',
    })).toMatchObject({ ok: false });
    expect(resolveGenerationMode({
      stage: 'family',
      category: 'structure',
      requested: 'prop',
    })).toEqual({ ok: true, mode: 'prop' });
  });
});
