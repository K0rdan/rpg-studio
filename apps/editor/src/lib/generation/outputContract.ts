import type { GenerationMode, PathAutotileLayoutId, TileSize } from '@packages/types';

import {
  PATH_CENTER_EDGES_CORNERS_V1,
  type PathAutotileLayout,
} from './pathAutotileLayout';

export const TRANSITION_ATLAS_COLUMNS = 8;
export const TRANSITION_ATLAS_ROWS = 8;

export type GenerationOutputKind = 'surface' | 'path-autotile' | 'prop' | 'transition';

/** Geometry shared by PromptBuilder and PostProcessor for one generation. */
export interface GenerationOutputContract {
  kind: GenerationOutputKind;
  generationMode: GenerationMode;
  tileSize: TileSize;
  columns: number;
  rows: number;
  width: number;
  height: number;
  pathAutotileLayoutId?: PathAutotileLayoutId;
  parentMaterialId?: string;
  layout?: PathAutotileLayout;
}

export function resolveOutputContract(input: {
  stage: 'base' | 'family' | 'transition';
  generationMode: GenerationMode;
  tileSize: TileSize;
  parentMaterialId?: string;
}): GenerationOutputContract {
  if (input.stage === 'transition') {
    return {
      kind: 'transition',
      generationMode: 'texture',
      tileSize: input.tileSize,
      columns: TRANSITION_ATLAS_COLUMNS,
      rows: TRANSITION_ATLAS_ROWS,
      width: input.tileSize * TRANSITION_ATLAS_COLUMNS,
      height: input.tileSize * TRANSITION_ATLAS_ROWS,
    };
  }

  switch (input.generationMode) {
    case 'path-autotile': {
      const layout = PATH_CENTER_EDGES_CORNERS_V1;
      return {
        kind: 'path-autotile',
        generationMode: 'path-autotile',
        tileSize: input.tileSize,
        columns: layout.columns,
        rows: layout.rows,
        width: input.tileSize * layout.columns,
        height: input.tileSize * layout.rows,
        pathAutotileLayoutId: layout.id,
        parentMaterialId: input.parentMaterialId,
        layout,
      };
    }
    case 'prop':
      return {
        kind: 'prop',
        generationMode: 'prop',
        tileSize: input.tileSize,
        columns: 1,
        rows: 1,
        width: input.tileSize,
        height: input.tileSize,
      };
    case 'texture':
      return {
        kind: 'surface',
        generationMode: 'texture',
        tileSize: input.tileSize,
        columns: 1,
        rows: 1,
        width: input.tileSize,
        height: input.tileSize,
      };
    default: {
      const exhaustive: never = input.generationMode;
      return exhaustive;
    }
  }
}
