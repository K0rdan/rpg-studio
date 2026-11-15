import type {
  GenerationMode,
  GenerationPromptSection,
  ProjectStyleSpec,
} from '@packages/types';

import { resolveOutputContract } from './outputContract';
import { PATH_CENTER_EDGES_CORNERS_V1 } from './pathAutotileLayout';

/**
 * Optional prompt experiments. Every flag defaults to off, which yields the
 * production prompt. The generation lab toggles them to compare variants.
 */
export interface PromptOptions {
  /** Ask for features sized to stay readable at the target tile resolution. */
  scaleAware?: boolean;
  /** Ask for a coarse visible pixel grid matching the tile size. */
  pixelGrid?: boolean;
  /** Name the reference material and state the new image is another one. */
  contrastReference?: boolean;
  /** Forbid a mosaic of repeated copies of the same motif. */
  singleMotif?: boolean;
}

export interface BasePromptInput {
  style: ProjectStyleSpec;
  subjectDescription: string;
  generationMode: GenerationMode;
  options?: PromptOptions;
}

export interface FamilyPromptInput extends BasePromptInput {
  /** Descriptions of the materials shown by the reference images. */
  referenceMaterials?: string[];
}

export interface TransitionPromptInput {
  style: ProjectStyleSpec;
}

export interface PathAutotilePromptInput {
  style: ProjectStyleSpec;
  subjectDescription: string;
  parentMaterialDescription: string;
  hasReferences: boolean;
}

export interface BuiltPrompt {
  prompt: string;
  sections: GenerationPromptSection[];
}

function buildPrompt(sections: GenerationPromptSection[]): BuiltPrompt {
  return {
    sections,
    prompt: sections.map((section) => section.text).join(' '),
  };
}

function outputInstructions(
  style: ProjectStyleSpec,
  generationMode: GenerationMode,
  stage: 'base' | 'transition' = 'base',
  options: PromptOptions = {},
): string {
  const contract = resolveOutputContract({
    stage,
    generationMode,
    tileSize: style.tileSize,
  });
  const moodInstruction = style.mood
    ? ` Use a ${style.mood} mood and theme.`
    : '';
  const scale = scaleInstructions(style, options);
  return `Output: ${contract.width}×${contract.height} px, ${style.perspective} perspective.${moodInstruction}${scale ? ` ${scale}` : ''}`;
}

function newImageInstructions(hasReferenceImages: boolean): string {
  return hasReferenceImages
    ? 'Generate a NEW pixel-art image from scratch. Do not edit, recolor, copy, transform, or modify any attached image.'
    : 'Generate a NEW pixel-art image from scratch.';
}

function styleSampleInstructions(
  subjectDescription: string,
  referenceMaterials: string[],
  options: PromptOptions,
): string {
  if (options.contrastReference) {
    const sampleMaterial = referenceMaterials.length > 0
      ? referenceMaterials.map((material) => material.trim()).join('; ')
      : 'a different material';
    return [
      `Each attached reference image is a STYLE SAMPLE of a different material (${sampleMaterial}).`,
      'Use only its rendering technique: pixel size, grain scale, outline weight, level of detail, and lighting direction.',
      `The new image shows ${subjectDescription.trim()} and nothing from the sample: not its shapes, layout, subject, or colors.`,
    ].join(' ');
  }
  return [
    'Each attached reference image is a STYLE SAMPLE only.',
    'Use only its rendering technique: pixel size, grain scale, outline weight, level of detail, and lighting direction.',
    'Do not reuse or copy its subject, layout, pattern, palette, or colors.',
  ].join(' ');
}

function scaleInstructions(style: ProjectStyleSpec, options: PromptOptions): string {
  const parts: string[] = [];
  if (options.scaleAware) {
    parts.push(
      `Design it as low-resolution pixel art that stays readable when reduced to ${style.tileSize}×${style.tileSize} px: every visible feature is large and simple, shapes are flat-shaded with 2 to 4 tones, outlines are at most 1 art pixel, and there is no noise, dithering, or isolated single pixels.`,
    );
  }
  if (options.pixelGrid) {
    parts.push(
      `Draw it on a coarse grid of ${style.tileSize}×${style.tileSize} visible pixels: each art pixel is a large uniform square block, with no anti-aliasing or blending between blocks.`,
    );
  }
  return parts.join(' ');
}

function pathReferenceInstructions(parentMaterialDescription: string): string {
  return [
    `The attached image is the parent surface material (${parentMaterialDescription.trim()}).`,
    'Continue that same single material and its rendering technique in a new atlas.',
    'Do not edit the attachment and do not introduce a second material.',
  ].join(' ');
}

function materialProfile(subjectDescription: string): 'cobblestone' | 'gravel' | 'earth' | 'generic' {
  const text = subjectDescription.toLowerCase();
  if (/cobble|paving|pavé|paves|flagstone/.test(text)) {
    return 'cobblestone';
  }
  if (/gravel|gravier|pebble/.test(text)) {
    return 'gravel';
  }
  if (/dirt|soil|earth|mud|terre|compact|sand|sable/.test(text)) {
    return 'earth';
  }
  return 'generic';
}

function textureConstraints(subjectDescription: string, options: PromptOptions = {}): string {
  const motif = options.singleMotif
    ? ' Paint one continuous patch, not a mosaic of repeated copies: no motif appears twice in the image.'
    : '';
  const base = textureProfileConstraints(subjectDescription);
  return `${base}${motif}`;
}

function textureProfileConstraints(subjectDescription: string): string {
  const shared = 'No visible grid lines, cell dividers, borders, road markings, competing materials, or a centered focal element. Do not draw a path silhouette; path placement is a mapping outcome.';
  const profile = materialProfile(subjectDescription);
  switch (profile) {
    case 'cobblestone':
      return `${shared} Paving stones and their joints are part of this material and must stay visible. Do not add large boulders or a second surface.`;
    case 'gravel':
      return `${shared} Fine gravel grains are part of this material. Do not add large rocks, paving slabs, or a second surface.`;
    case 'earth':
      return `${shared} Do not add large stones, paving, or distinct objects.`;
    case 'generic':
      return `${shared} Do not add distinct objects that are not intrinsic to the requested material.`;
    default: {
      const exhaustive: never = profile;
      return exhaustive;
    }
  }
}

function pathAutotileContent(subjectDescription: string, parentMaterialDescription: string): string {
  const order = PATH_CENTER_EDGES_CORNERS_V1.slots.map((slot) => slot.label).join(', ');
  return [
    `Create a pixel-art path autotile atlas for exactly one material: ${subjectDescription.trim()}.`,
    `The parent surface is ${parentMaterialDescription.trim()}.`,
    `Place these variants in this fixed order, left to right and top to bottom: ${order}.`,
    'Do not draw visible cell borders or separators.',
    'Do not combine other path materials such as dirt trails, paving, and asphalt in the same image.',
  ].join(' ');
}

function modeContent(
  style: ProjectStyleSpec,
  generationMode: GenerationMode,
  subjectDescription: string,
): string {
  switch (generationMode) {
    case 'texture':
      return `A single seamless, tileable ${style.perspective} texture for a 2D RPG: ${subjectDescription.trim()}. One uninterrupted material covering one square patch whose outer left/right and top/bottom edges wrap seamlessly.`;
    case 'path-autotile':
      return pathAutotileContent(subjectDescription, subjectDescription);
    case 'prop':
      return `Create pixel art of ${subjectDescription.trim()} as one isolated decorative object on a flat, uniform background. Do not draw a landscape and do not rely on real transparency.`;
    default: {
      const exhaustive: never = generationMode;
      return exhaustive;
    }
  }
}

function constraintText(
  generationMode: GenerationMode,
  subjectDescription: string,
  options: PromptOptions = {},
): string {
  switch (generationMode) {
    case 'texture':
      return textureConstraints(subjectDescription, options);
    case 'path-autotile':
      return 'Do not draw visible cell separators. Describe exactly one path material and do not mix dirt, paving, and asphalt.';
    case 'prop':
      return '';
    default: {
      const exhaustive: never = generationMode;
      return exhaustive;
    }
  }
}

function familySections(
  style: ProjectStyleSpec,
  subjectDescription: string,
  generationMode: GenerationMode,
  hasReferences: boolean,
  options: PromptOptions = {},
  referenceMaterials: string[] = [],
): GenerationPromptSection[] {
  const constraints = constraintText(generationMode, subjectDescription, options);
  return [
    { id: 'new-image', title: 'New image', text: newImageInstructions(hasReferences) },
    { id: 'content', title: 'Requested content', text: modeContent(style, generationMode, subjectDescription) },
    ...(constraints ? [{ id: 'constraints' as const, title: 'Content constraints', text: constraints }] : []),
    ...(hasReferences
      ? [{
        id: 'references' as const,
        title: 'Reference usage',
        text: generationMode === 'path-autotile'
          ? pathReferenceInstructions(subjectDescription)
          : styleSampleInstructions(subjectDescription, referenceMaterials, options),
      }]
      : []),
    { id: 'output', title: 'Output contract', text: outputInstructions(style, generationMode, 'base', options) },
  ];
}

export function buildBasePrompt({
  style,
  subjectDescription,
  generationMode,
  options,
}: BasePromptInput): BuiltPrompt {
  return buildPrompt(familySections(style, subjectDescription, generationMode, false, options));
}

export function buildFamilyPrompt({
  style,
  subjectDescription,
  generationMode,
  options,
  referenceMaterials,
}: FamilyPromptInput): BuiltPrompt {
  return buildPrompt(familySections(
    style,
    subjectDescription,
    generationMode,
    true,
    options,
    referenceMaterials,
  ));
}

export function buildPathAutotilePrompt({
  style,
  subjectDescription,
  parentMaterialDescription,
  hasReferences,
}: PathAutotilePromptInput): BuiltPrompt {
  const constraints = constraintText('path-autotile', subjectDescription);
  return buildPrompt([
    { id: 'new-image', title: 'New image', text: newImageInstructions(hasReferences) },
    {
      id: 'content',
      title: 'Requested content',
      text: pathAutotileContent(subjectDescription, parentMaterialDescription),
    },
    { id: 'constraints', title: 'Content constraints', text: constraints },
    ...(hasReferences
      ? [{
        id: 'references' as const,
        title: 'Reference usage',
        text: pathReferenceInstructions(parentMaterialDescription),
      }]
      : []),
    { id: 'output', title: 'Output contract', text: outputInstructions(style, 'path-autotile') },
  ]);
}

export function buildTransitionPrompt({
  style,
}: TransitionPromptInput): BuiltPrompt {
  return buildPrompt([
    { id: 'new-image', title: 'New image', text: newImageInstructions(true) },
    {
      id: 'content',
      title: 'Requested content',
      text: 'Create pixel-art 2D transition tiles joining the two attached terrain families. Create an uninterrupted transition atlas with edge, corner, and join variants between the two terrain families so adjacent map regions meet seamlessly.',
    },
    {
      id: 'references',
      title: 'Reference usage',
      text: 'Match the attached reference image(s) for both families in palette, outline weight, lighting, and edge occupancy. Fill the sheet with edge, corner, and join variants so adjacent map regions meet continuously.',
    },
    { id: 'output', title: 'Output contract', text: outputInstructions(style, 'texture', 'transition') },
  ]);
}
