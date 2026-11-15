import {
  isTileFamilyCategory,
  type GenerationMode,
  type TileFamilyCategory,
} from '@packages/types';

export const CATEGORY_MODE: Record<
  TileFamilyCategory,
  GenerationMode | 'creator-choice'
> = {
  ground: 'texture',
  water: 'texture',
  decoration: 'prop',
  elevation: 'creator-choice',
  vegetation: 'creator-choice',
  structure: 'creator-choice',
};

export type GenerationStage = 'base' | 'family' | 'transition';

export type ResolveGenerationModeResult =
  | { ok: true; mode: GenerationMode }
  | { ok: false; message: string };

export function categoryModeOf(
  category: TileFamilyCategory,
): GenerationMode | 'creator-choice' {
  return CATEGORY_MODE[category];
}

function hasParentMaterial(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function resolveGenerationMode(input: {
  stage: GenerationStage;
  category?: unknown;
  requested?: unknown;
  parentMaterialId?: unknown;
}): ResolveGenerationModeResult {
  if (input.stage === 'transition') {
    return { ok: true, mode: 'texture' };
  }

  if (!isTileFamilyCategory(input.category)) {
    return { ok: false, message: 'A valid family category is required' };
  }

  if (input.requested === 'path-autotile') {
    if (input.category === 'decoration') {
      return {
        ok: false,
        message: 'Decoration families are isolated props, not path autotiles',
      };
    }
    if (!hasParentMaterial(input.parentMaterialId)) {
      return {
        ok: false,
        message: 'A path autotile requires a parent surface material',
      };
    }
    return { ok: true, mode: 'path-autotile' };
  }

  const mapped = CATEGORY_MODE[input.category];
  if (mapped === 'creator-choice') {
    if (input.requested !== 'texture' && input.requested !== 'prop') {
      return {
        ok: false,
        message: 'Choose texture or prop for this category',
      };
    }
    return { ok: true, mode: input.requested };
  }

  if (input.requested !== undefined && input.requested !== mapped) {
    return {
      ok: false,
      message: `${input.category} families use ${mapped} mode`,
    };
  }

  return { ok: true, mode: mapped };
}
