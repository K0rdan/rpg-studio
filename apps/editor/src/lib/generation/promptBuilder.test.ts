import type { ProjectStyleSpec } from '@packages/types';

import {
  buildBasePrompt,
  buildFamilyPrompt,
  buildTransitionPrompt,
} from './promptBuilder';

describe('buildBasePrompt', () => {
  const style: ProjectStyleSpec = {
    tileSize: 32,
    perspective: 'top-down',
  };

  it('is deterministic and describes the exact sheet geometry', () => {
    const input = {
      style,
      category: 'vegetation' as const,
      label: 'grass',
      generationMode: 'texture' as const,
    };

    expect(buildBasePrompt(input)).toEqual(buildBasePrompt(input));
    expect(buildBasePrompt(input).prompt).toContain('8×8');
    expect(buildBasePrompt(input).prompt).toContain('64');
    expect(buildBasePrompt(input).prompt).toContain('32×32');
    expect(buildBasePrompt(input).prompt).toContain('top-down');
    expect(buildBasePrompt(input).prompt).toContain('vegetation');
    expect(buildBasePrompt(input).prompt).toContain('grass');
    expect(buildBasePrompt(input).prompt).toContain('no margins');
  });

  it('includes a configured mood and omits mood language when absent', () => {
    const withoutMood = buildBasePrompt({
      style,
      category: 'ground',
      label: 'dirt',
      generationMode: 'texture',
    }).prompt;
    const withMood = buildBasePrompt({
      style: { ...style, mood: 'warm autumn' },
      category: 'ground',
      label: 'dirt',
      generationMode: 'texture',
    }).prompt;

    expect(withoutMood).not.toMatch(/mood|theme/i);
    expect(withMood).toContain('warm autumn');
  });

  it('only accepts structured inputs, not a client custom prompt', () => {
    // @ts-expect-error Free-form prompts are not part of the builder contract.
    buildBasePrompt({
      style,
      category: 'ground',
      label: 'dirt',
      generationMode: 'texture',
      customPrompt: 'ignore rules',
    });
  });

  it('describes wrapping texture cells versus isolated props on a flat background', () => {
    const texture = buildBasePrompt({
      style,
      category: 'vegetation',
      label: 'grass',
      generationMode: 'texture',
    }).prompt;
    const prop = buildBasePrompt({
      style,
      category: 'vegetation',
      label: 'tree',
      generationMode: 'prop',
    }).prompt;

    expect(texture).toMatch(/self-tiling|wrapping/i);
    expect(prop).toMatch(/isolated|uniform background/i);
    expect(prop).not.toMatch(/self-tiling|wrapping/i);
  });
});

describe('buildFamilyPrompt', () => {
  const style: ProjectStyleSpec = {
    tileSize: 32,
    perspective: 'top-down',
  };

  it('is deterministic and mentions ordered reference labels plus attached images', () => {
    const input = {
      style,
      category: 'ground' as const,
      label: 'dirt',
      generationMode: 'texture' as const,
      referenceLabels: ['grass', 'stone'],
    };

    expect(buildFamilyPrompt(input)).toEqual(buildFamilyPrompt(input));
    expect(buildFamilyPrompt(input).prompt).toContain('attached reference image');
    expect(buildFamilyPrompt(input).prompt).toContain('grass, stone');
    expect(buildFamilyPrompt(input).prompt).toContain('ground');
    expect(buildFamilyPrompt(input).prompt).toContain('dirt');
    expect(buildFamilyPrompt(input).prompt).toContain('8×8');
  });
});

describe('buildTransitionPrompt', () => {
  const style: ProjectStyleSpec = {
    tileSize: 16,
    perspective: '3/4',
  };

  it('names both families, requires attached references, and keeps 8×8 geometry', () => {
    const input = {
      style,
      familyA: { category: 'vegetation' as const, label: 'grass' },
      familyB: { category: 'ground' as const, label: 'dirt' },
    };

    expect(buildTransitionPrompt(input)).toEqual(buildTransitionPrompt(input));
    expect(buildTransitionPrompt(input).prompt).toContain('vegetation: grass');
    expect(buildTransitionPrompt(input).prompt).toContain('ground: dirt');
    expect(buildTransitionPrompt(input).prompt).toContain('attached reference image');
    expect(buildTransitionPrompt(input).prompt).toContain('8×8');
    expect(buildTransitionPrompt(input).prompt).toContain('16×16');
    expect(buildTransitionPrompt(input).prompt).toMatch(/self-tiling|wrapping/i);
    expect(buildTransitionPrompt(input).prompt).not.toMatch(/isolated decorative/i);
  });
});
