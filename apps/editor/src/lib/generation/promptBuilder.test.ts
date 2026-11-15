import type { ProjectStyleSpec } from '@packages/types';

import {
  buildBasePrompt,
  buildFamilyPrompt,
  buildPathAutotilePrompt,
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

    expect(prompt).toContain('32×32');
    expect(prompt).toContain('short dense green grass');
    expect(prompt).toContain('grid lines');
    expect(prompt).not.toContain('vegetation');
  });

  it('requires a newly generated image and expresses the final output contract', () => {
    const result = buildBasePrompt({
      style,
      subjectDescription: 'short dense green grass',
      generationMode: 'texture',
    });

    expect(result.prompt).toContain('Generate a NEW pixel-art image from scratch.');
    expect(result.prompt).toContain('Output: 32×32 px, top-down perspective.');
    expect(result.sections).toEqual([
      expect.objectContaining({ id: 'new-image', title: 'New image' }),
      expect.objectContaining({ id: 'content', title: 'Requested content' }),
      expect.objectContaining({ id: 'constraints', title: 'Content constraints' }),
      expect.objectContaining({ id: 'output', title: 'Output contract' }),
    ]);
    expect(result.prompt).toBe(result.sections.map((section) => section.text).join(' '));
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

  it('treats attached images as technique-only style samples, not edit sources', () => {
    const result = buildFamilyPrompt({
      style: { tileSize: 32, perspective: 'top-down' },
      subjectDescription: 'lush green grass',
      generationMode: 'texture',
    });
    const prompt = result.prompt;

    expect(prompt).toContain('Generate a NEW pixel-art image from scratch.');
    expect(prompt).toContain('Do not edit, recolor, copy, transform, or modify any attached image.');
    expect(prompt).toContain('STYLE SAMPLE only');
    expect(prompt).toContain('pixel size, grain scale, outline weight, level of detail, and lighting direction');
    expect(prompt).toContain('Do not reuse or copy its subject, layout, pattern, palette, or colors.');
    expect(prompt).not.toContain('Match the attached reference image(s) in palette');
    expect(result.sections.find((section) => section.id === 'references')).toEqual(
      expect.objectContaining({ title: 'Reference usage' }),
    );
  });
});

describe('buildTransitionPrompt', () => {
  it('uses attached family images and does not include asset names', () => {
    const prompt = buildTransitionPrompt({
      style: { tileSize: 16, perspective: '3/4' },
    }).prompt;

    expect(prompt).toContain('attached reference image');
    expect(prompt).toContain('128×128');
    expect(prompt).toMatch(/seamless/i);
    expect(prompt).toContain('Generate a NEW pixel-art image from scratch.');
  });
});

describe('material-aware texture constraints', () => {
  const style: ProjectStyleSpec = { tileSize: 32, perspective: 'top-down' };

  it('lets cobblestone keep paving stones and joints', () => {
    const prompt = buildBasePrompt({
      style,
      subjectDescription: 'irregular medieval cobblestone',
      generationMode: 'texture',
    }).prompt;

    expect(prompt).toMatch(/paving stones and their joints/i);
    expect(prompt).not.toMatch(/no stones|without stones/i);
    expect(prompt).toContain('32×32');
  });

  it('allows fine gravel and forbids large rocks', () => {
    const prompt = buildBasePrompt({
      style,
      subjectDescription: 'fine grey gravel',
      generationMode: 'texture',
    }).prompt;

    expect(prompt).toMatch(/fine gravel grains/i);
    expect(prompt).toMatch(/large rocks/i);
  });

  it('forbids large stones on compacted earth', () => {
    const prompt = buildBasePrompt({
      style,
      subjectDescription: 'compacted dry earth',
      generationMode: 'texture',
    }).prompt;

    expect(prompt).toMatch(/large stones/i);
    expect(prompt).not.toMatch(/paving stones and their joints/i);
    expect(prompt).toMatch(/do not draw a path silhouette/i);
  });
});

describe('buildPathAutotilePrompt', () => {
  it('names one material, its parent, and the fixed slot order', () => {
    const result = buildPathAutotilePrompt({
      style: { tileSize: 32, perspective: 'top-down' },
      subjectDescription: 'compacted dry earth',
      parentMaterialDescription: 'dry packed earth',
      hasReferences: true,
    });

    expect(result.prompt).toContain('exactly one material: compacted dry earth');
    expect(result.prompt).toContain('parent surface is dry packed earth');
    expect(result.prompt).toContain('centre');
    expect(result.prompt).toContain('northwest corner');
    expect(result.prompt).toContain('Do not draw visible cell borders');
    expect(result.prompt).toContain('Do not combine other path materials');
    expect(result.prompt).toContain('96×96');
    expect(result.prompt).toContain('Generate a NEW pixel-art image from scratch.');
    expect(result.prompt).not.toContain('STYLE SAMPLE only');
    expect(result.sections.map((section) => section.id)).toEqual([
      'new-image',
      'content',
      'constraints',
      'references',
      'output',
    ]);
  });
});

describe('prompt options', () => {
  const style: ProjectStyleSpec = { tileSize: 32, perspective: 'top-down' };
  const input = {
    style,
    subjectDescription: 'water surface',
    generationMode: 'texture' as const,
  };

  it('leaves the production prompt untouched when no flag is set', () => {
    expect(buildFamilyPrompt({ ...input, options: {} }).prompt)
      .toBe(buildFamilyPrompt(input).prompt);
    expect(buildBasePrompt({ ...input, options: {} }).prompt)
      .toBe(buildBasePrompt(input).prompt);
  });

  it('asks for tile-resolution features and a coarse grid when requested', () => {
    const prompt = buildBasePrompt({
      ...input,
      options: { scaleAware: true, pixelGrid: true },
    }).prompt;

    expect(prompt).toContain('readable when reduced to 32×32 px');
    expect(prompt).toContain('grid of 32×32 visible pixels');
  });

  it('forbids a mosaic of repeated motifs', () => {
    const prompt = buildBasePrompt({ ...input, options: { singleMotif: true } }).prompt;

    expect(prompt).toContain('not a mosaic of repeated copies');
  });

  it('names the reference material and excludes it', () => {
    const prompt = buildFamilyPrompt({
      ...input,
      options: { contrastReference: true },
      referenceMaterials: ['grey cobblestone ground'],
    }).prompt;

    expect(prompt).toContain('STYLE SAMPLE of a different material (grey cobblestone ground)');
    expect(prompt).toContain('The new image shows water surface and nothing from the sample');
  });
});
