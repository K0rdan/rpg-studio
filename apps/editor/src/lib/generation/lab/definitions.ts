import type {
  GenerationMode,
  ProjectStyleSpec,
  TileFamilyCategory,
} from '@packages/types';

import type { PostProcessOptions } from '../postProcessor';
import type { PromptOptions } from '../promptBuilder';
import type { ReferenceMode } from '../referencePrep';

/**
 * Generation lab vocabulary.
 *
 * - A **case** is a fixed input (what the creator asked for + the references).
 * - A **generation variant** changes what is sent to the model (prompt flags,
 *   how references are shown). It costs one model call per case and repeat.
 * - A **post variant** changes how a raw image becomes a tile. It is replayed
 *   on every raw image for free.
 *
 * Cases and variants are data on purpose: a run is described by their ids, so
 * two runs are comparable as long as they share ids.
 */

export interface LabReference {
  id: string;
  /** What the reference shows; used by the `contrastReference` prompt option. */
  description: string;
  /** File name inside the fixtures directory. */
  file?: string;
  /** In-memory bytes (used when a case is rebuilt from a debug dump). */
  bytes?: Uint8Array;
}

export interface LabCase {
  id: string;
  label: string;
  category: TileFamilyCategory;
  subjectDescription: string;
  generationMode: GenerationMode;
  style: ProjectStyleSpec;
  references: LabReference[];
}

export interface GenerationVariant {
  id: string;
  label: string;
  prompt: PromptOptions;
  reference: ReferenceMode;
  /** Variants that only differ by reference handling are meaningless without one. */
  needsReference: boolean;
}

export interface PostVariant {
  id: string;
  label: string;
  options: PostProcessOptions;
}

const STYLE_32: ProjectStyleSpec = { tileSize: 32, perspective: 'top-down' };

const GROUND_REFERENCE = {
  id: 'ground-gen1',
  description: 'grey-brown cobblestone ground with rounded paving stones',
};

export const LAB_CASES: LabCase[] = [
  {
    id: 'water-ref256',
    label: 'Water, reference ground-gen1 (256px legacy tile)',
    category: 'water',
    subjectDescription: 'water material that could be used to draw seas, lacs or smaller water surfaces',
    generationMode: 'texture',
    style: STYLE_32,
    references: [{ ...GROUND_REFERENCE, file: 'ground-gen1-256.png' }],
  },
  {
    id: 'water-ref32',
    label: 'Water, reference ground-gen1 (32px tile as the new pipeline stores it)',
    category: 'water',
    subjectDescription: 'water material that could be used to draw seas, lacs or smaller water surfaces',
    generationMode: 'texture',
    style: STYLE_32,
    references: [{ ...GROUND_REFERENCE, file: 'ground-gen1-32.png' }],
  },
  {
    id: 'grass-ref256',
    label: 'Grass, reference ground-gen1',
    category: 'vegetation',
    subjectDescription: 'short dense green grass',
    generationMode: 'texture',
    style: STYLE_32,
    references: [{ ...GROUND_REFERENCE, file: 'ground-gen1-256.png' }],
  },
  {
    id: 'sand-ref256',
    label: 'Sand, reference ground-gen1',
    category: 'ground',
    subjectDescription: 'fine dry beach sand',
    generationMode: 'texture',
    style: STYLE_32,
    references: [{ ...GROUND_REFERENCE, file: 'ground-gen1-256.png' }],
  },
  {
    id: 'dirt-base',
    label: 'Packed dirt, first family (no reference)',
    category: 'ground',
    subjectDescription: 'dry packed brown earth',
    generationMode: 'texture',
    style: STYLE_32,
    references: [],
  },
  {
    id: 'gravel-base',
    label: 'Fine gravel, first family (no reference)',
    category: 'ground',
    subjectDescription: 'fine grey gravel',
    generationMode: 'texture',
    style: STYLE_32,
    references: [],
  },
];

export const GENERATION_VARIANTS: GenerationVariant[] = [
  {
    id: 'baseline',
    label: 'Production prompt, reference sent as is',
    prompt: {},
    reference: 'full',
    needsReference: false,
  },
  {
    id: 'scale-aware',
    label: 'Baseline + features sized for the tile resolution',
    prompt: { scaleAware: true },
    reference: 'full',
    needsReference: false,
  },
  {
    id: 'pixel-grid',
    label: 'Baseline + coarse visible pixel grid of tile size',
    prompt: { pixelGrid: true },
    reference: 'full',
    needsReference: false,
  },
  {
    id: 'single-motif',
    label: 'Baseline + no mosaic of repeated motifs',
    prompt: { singleMotif: true },
    reference: 'full',
    needsReference: false,
  },
  {
    id: 'contrast-ref',
    label: 'Baseline + reference material named and excluded',
    prompt: { contrastReference: true },
    reference: 'full',
    needsReference: true,
  },
  {
    id: 'ref-gray',
    label: 'Baseline prompt, greyscale reference',
    prompt: {},
    reference: 'gray',
    needsReference: true,
  },
  {
    id: 'ref-scrambled',
    label: 'Baseline prompt, greyscale tile-shuffled reference',
    prompt: {},
    reference: 'scrambled-gray',
    needsReference: true,
  },
  {
    id: 'ref-none',
    label: 'Baseline prompt, no reference image',
    prompt: {},
    reference: 'none',
    needsReference: true,
  },
  {
    id: 'combo',
    label: 'Scale-aware + single motif + contrast, shuffled greyscale reference',
    prompt: {
      scaleAware: true,
      singleMotif: true,
      contrastReference: true,
    },
    reference: 'scrambled-gray',
    needsReference: false,
  },
];

export const POST_VARIANTS: PostVariant[] = [
  {
    id: 'nearest-32',
    label: 'Production: nearest sampling, sharp palette (really up to 256 colours)',
    options: { downscale: 'nearest', quantiser: 'sharp', colours: 32, cropFraction: 1 },
  },
  {
    id: 'nearest-mc16',
    label: 'Nearest sampling, exact 16-colour palette',
    options: { downscale: 'nearest', quantiser: 'median-cut', colours: 16, cropFraction: 1 },
  },
  {
    id: 'lanczos-mc16',
    label: 'Smooth resampling, exact 16-colour palette',
    options: { downscale: 'lanczos', quantiser: 'median-cut', colours: 16, cropFraction: 1 },
  },
  {
    id: 'block-mc32',
    label: 'Block-mode downscale, exact 32-colour palette',
    options: { downscale: 'block-mode', quantiser: 'median-cut', colours: 32, cropFraction: 1 },
  },
  {
    id: 'block-mc16',
    label: 'Block-mode downscale, exact 16-colour palette',
    options: { downscale: 'block-mode', quantiser: 'median-cut', colours: 16, cropFraction: 1 },
  },
  {
    id: 'block-mc16-crop50',
    label: 'Centre half of the raw image, block-mode, 16 colours',
    options: { downscale: 'block-mode', quantiser: 'median-cut', colours: 16, cropFraction: 0.5 },
  },
  {
    id: 'block-mc16-crop25',
    label: 'Centre quarter of the raw image, block-mode, 16 colours',
    options: { downscale: 'block-mode', quantiser: 'median-cut', colours: 16, cropFraction: 0.25 },
  },
];

export const BASELINE_GENERATION_VARIANT_ID = 'baseline';
export const BASELINE_POST_VARIANT_ID = 'nearest-32';

export interface LabPreset {
  id: string;
  description: string;
  caseIds: string[];
  generationVariantIds: string[];
  postVariantIds: string[];
  repeats: number;
}

export const LAB_PRESETS: LabPreset[] = [
  {
    id: 'smoke',
    description: 'One case, two generation variants, one repeat: checks the plumbing for ~2 model calls.',
    caseIds: ['water-ref256'],
    generationVariantIds: ['baseline', 'ref-scrambled'],
    postVariantIds: POST_VARIANTS.map((variant) => variant.id),
    repeats: 1,
  },
  {
    id: 'water',
    description: 'The reported failure only: every generation variant on water, 3 repeats.',
    caseIds: ['water-ref256', 'water-ref32'],
    generationVariantIds: GENERATION_VARIANTS.map((variant) => variant.id),
    postVariantIds: POST_VARIANTS.map((variant) => variant.id),
    repeats: 3,
  },
  {
    id: 'full',
    description: 'Every case and variant, 3 repeats. Roughly 140 model calls.',
    caseIds: LAB_CASES.map((labCase) => labCase.id),
    generationVariantIds: GENERATION_VARIANTS.map((variant) => variant.id),
    postVariantIds: POST_VARIANTS.map((variant) => variant.id),
    repeats: 3,
  },
];
