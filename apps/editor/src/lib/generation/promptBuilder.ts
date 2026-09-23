import type {
  GenerationMode,
  ProjectStyleSpec,
  TileFamilyCategory,
} from '@packages/types';

export interface BasePromptInput {
  style: ProjectStyleSpec;
  category: TileFamilyCategory;
  label: string;
  generationMode: GenerationMode;
}

export interface FamilyPromptInput extends BasePromptInput {
  referenceLabels: string[];
}

export interface TransitionPromptInput {
  style: ProjectStyleSpec;
  familyA: { category: TileFamilyCategory; label: string };
  familyB: { category: TileFamilyCategory; label: string };
}

export interface BuiltPrompt {
  prompt: string;
}

function sheetInstructions(style: ProjectStyleSpec): string {
  const moodInstruction = style.mood
    ? ` Use a ${style.mood} mood and theme.`
    : '';
  return [
    `Use an exact 8×8 grid containing 64 square cells, each representing one ${style.tileSize}×${style.tileSize} pixel tile.`,
    `Use a ${style.perspective} perspective.${moodInstruction}`,
    'Keep every cell aligned to the grid with crisp hard edges and no margins, spacing, labels, or borders.',
    `The complete sheet will be ${style.tileSize * 8}×${style.tileSize * 8} pixels.`,
  ].join(' ');
}

function modeInstructions(generationMode: GenerationMode): string {
  switch (generationMode) {
    case 'texture':
      return 'Each cell is a continuous wrapping material whose left/right and top/bottom edges match themselves for seamless self-tiling.';
    case 'prop':
      return 'Each cell is an isolated decorative object on a flat, uniform background. Do not draw a landscape and do not rely on real transparency.';
    default: {
      const exhaustive: never = generationMode;
      return exhaustive;
    }
  }
}

export function buildBasePrompt({
  style,
  category,
  label,
  generationMode,
}: BasePromptInput): BuiltPrompt {
  return {
    prompt: [
      `Create a pixel-art 2D tileset family for ${category}: ${label}.`,
      modeInstructions(generationMode),
      sheetInstructions(style),
    ].join(' '),
  };
}

export function buildFamilyPrompt({
  style,
  category,
  label,
  generationMode,
  referenceLabels,
}: FamilyPromptInput): BuiltPrompt {
  const references = referenceLabels.join(', ');
  return {
    prompt: [
      `Create a pixel-art 2D tileset family for ${category}: ${label}.`,
      modeInstructions(generationMode),
      `Match the attached reference image(s) for ${references} in palette, outline weight, lighting, and level of detail.`,
      sheetInstructions(style),
    ].join(' '),
  };
}

export function buildTransitionPrompt({
  style,
  familyA,
  familyB,
}: TransitionPromptInput): BuiltPrompt {
  return {
    prompt: [
      `Create pixel-art 2D transition tiles that join ${familyA.category}: ${familyA.label} with ${familyB.category}: ${familyB.label}.`,
      modeInstructions('texture'),
      'Match the attached reference image(s) for both families in palette, outline weight, lighting, and edge occupancy.',
      'Fill the sheet with edge, corner, and join variants so adjacent map regions meet continuously.',
      sheetInstructions(style),
    ].join(' '),
  };
}
