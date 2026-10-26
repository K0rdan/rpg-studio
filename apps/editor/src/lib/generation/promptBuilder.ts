import type { GenerationMode, ProjectStyleSpec } from '@packages/types';

export interface BasePromptInput {
  style: ProjectStyleSpec;
  subjectDescription: string;
  generationMode: GenerationMode;
}

export type FamilyPromptInput = BasePromptInput;

export interface TransitionPromptInput {
  style: ProjectStyleSpec;
}

export interface BuiltPrompt {
  prompt: string;
}

function sheetInstructions(style: ProjectStyleSpec): string {
  const moodInstruction = style.mood
    ? ` Use a ${style.mood} mood and theme.`
    : '';
  return [
    `Create a ${style.tileSize * 8}×${style.tileSize * 8} pixel image.`,
    `Use a ${style.perspective} perspective.${moodInstruction}`,
  ].join(' ');
}

function modeInstructions(
  style: ProjectStyleSpec,
  generationMode: GenerationMode,
  subjectDescription: string,
): string {
  switch (generationMode) {
    case 'texture':
      return `A single seamless, tileable ${style.perspective} texture for a 2D RPG: ${subjectDescription.trim()}. Edge-to-edge continuous pattern whose outer left/right and top/bottom edges wrap seamlessly, with no visible seams, grid lines, borders, framing, or distinct centered objects.`;
    case 'prop':
      return `Create pixel art of ${subjectDescription.trim()} as an isolated decorative object on a flat, uniform background. Do not draw a landscape and do not rely on real transparency.`;
    default: {
      const exhaustive: never = generationMode;
      return exhaustive;
    }
  }
}

function textureExclusions(generationMode: GenerationMode): string {
  // This instruction only applies to terrain textures, never to props.
  return generationMode === 'texture'
    ? 'Show only the requested terrain material: no other terrain types or materials, paths, stones, distinct objects, or centered focal elements.'
    : '';
}

export function buildBasePrompt({
  style,
  subjectDescription,
  generationMode,
}: BasePromptInput): BuiltPrompt {
  return {
    prompt: [
      sheetInstructions(style),
      'Create a pixel-art image.',
      modeInstructions(style, generationMode, subjectDescription),
      textureExclusions(generationMode),
    ].join(' '),
  };
}

export function buildFamilyPrompt({
  style,
  subjectDescription,
  generationMode,
}: FamilyPromptInput): BuiltPrompt {
  return {
    prompt: [
      'Create a pixel-art image.',
      modeInstructions(style, generationMode, subjectDescription),
      textureExclusions(generationMode),
      'Match the attached reference image(s) in palette, outline weight, lighting, and level of detail.',
      sheetInstructions(style),
    ].join(' '),
  };
}

export function buildTransitionPrompt({
  style,
}: TransitionPromptInput): BuiltPrompt {
  return {
    prompt: [
      'Create pixel-art 2D transition tiles joining the two attached terrain families.',
      'Create an uninterrupted transition atlas with edge, corner, and join variants between the two terrain families. Each tile must self-tile seamlessly and preserve the visual continuity of both families.',
      'Match the attached reference image(s) for both families in palette, outline weight, lighting, and edge occupancy.',
      'Fill the sheet with edge, corner, and join variants so adjacent map regions meet continuously.',
      sheetInstructions(style),
    ].join(' '),
  };
}
