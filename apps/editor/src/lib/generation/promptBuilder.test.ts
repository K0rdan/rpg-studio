import type { ProjectStyleSpec } from '@packages/types';

import {
  buildBasePrompt,
  buildFamilyPrompt,
  buildTransitionPrompt,
} from './promptBuilder';

describe('buildBasePrompt', () => {
  const style: ProjectStyleSpec = { tileSize: 32, perspective: 'top-down' };

  it('uses the functional description, not organization metadata', () => {
    const prompt = buildBasePrompt({
      style,
      subjectDescription: 'short dense green grass',
      generationMode: 'texture',
    }).prompt;

    expect(prompt).toContain('256×256');
    expect(prompt).toContain('short dense green grass');
    expect(prompt).toContain('no grid lines');
    expect(prompt).not.toContain('vegetation');
  });

  it('includes optional mood and omits it when absent', () => {
    const prompt = buildBasePrompt({
      style: { ...style, mood: 'warm autumn' },
      subjectDescription: 'dark wet soil',
      generationMode: 'texture',
    }).prompt;
    const noMood = buildBasePrompt({
      style,
      subjectDescription: 'dark wet soil',
      generationMode: 'texture',
    }).prompt;

    expect(prompt).toContain('warm autumn');
    expect(noMood).not.toMatch(/mood|theme/i);
  });

  it('uses the requested object description for props without texture exclusions', () => {
    const prompt = buildBasePrompt({
      style,
      subjectDescription: 'small pine tree',
      generationMode: 'prop',
    }).prompt;

    expect(prompt).toContain('small pine tree');
    expect(prompt).toMatch(/isolated|uniform background/i);
    expect(prompt).not.toMatch(/no other terrain types/);
  });
});

describe('buildFamilyPrompt', () => {
  it('uses a functional description and attached references without organizational metadata', () => {
    const prompt = buildFamilyPrompt({
      style: { tileSize: 32, perspective: 'top-down' },
      subjectDescription: 'brown muddy soil',
      generationMode: 'texture',
    }).prompt;

    expect(prompt).toContain('brown muddy soil');
    expect(prompt).toContain('attached reference image');
    expect(prompt).not.toContain('ground');
    expect(prompt).not.toContain('dirt-asset-name');
  });
});

describe('buildTransitionPrompt', () => {
  it('uses attached family images and does not include asset names', () => {
    const prompt = buildTransitionPrompt({
      style: { tileSize: 16, perspective: '3/4' },
    }).prompt;

    expect(prompt).toContain('attached reference image');
    expect(prompt).toContain('128×128');
    expect(prompt).toMatch(/self-tile|seamless/i);
  });
});
