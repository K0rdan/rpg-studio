import type { PathAutotileLayoutId } from '@packages/types';

export type AutotileSide = 'north' | 'east' | 'south' | 'west';

export interface PathAutotileSlot {
  id: string;
  column: number;
  row: number;
  label: string;
  required: boolean;
}

export interface PathAutotileAdjacency {
  slotId: string;
  side: AutotileSide;
  neighborId: string;
  neighborSide: AutotileSide;
}

export interface PathAutotileLayout {
  id: PathAutotileLayoutId;
  columns: number;
  rows: number;
  slots: readonly PathAutotileSlot[];
  adjacencies: readonly PathAutotileAdjacency[];
}

/**
 * First path atlas: centre, four edges, and four outer corners.
 * Junctions are intentionally absent and must not be offered as if they existed.
 *
 *   corner-nw  edge-n  corner-ne
 *   edge-w     center  edge-e
 *   corner-sw  edge-s  corner-se
 */
export const PATH_CENTER_EDGES_CORNERS_V1: PathAutotileLayout = {
  id: 'path-center-edges-corners-v1',
  columns: 3,
  rows: 3,
  slots: [
    { id: 'corner-nw', column: 0, row: 0, label: 'northwest corner', required: true },
    { id: 'edge-n', column: 1, row: 0, label: 'north edge', required: true },
    { id: 'corner-ne', column: 2, row: 0, label: 'northeast corner', required: true },
    { id: 'edge-w', column: 0, row: 1, label: 'west edge', required: true },
    { id: 'center', column: 1, row: 1, label: 'centre', required: true },
    { id: 'edge-e', column: 2, row: 1, label: 'east edge', required: true },
    { id: 'corner-sw', column: 0, row: 2, label: 'southwest corner', required: true },
    { id: 'edge-s', column: 1, row: 2, label: 'south edge', required: true },
    { id: 'corner-se', column: 2, row: 2, label: 'southeast corner', required: true },
  ],
  adjacencies: [
    { slotId: 'center', side: 'north', neighborId: 'edge-n', neighborSide: 'south' },
    { slotId: 'center', side: 'east', neighborId: 'edge-e', neighborSide: 'west' },
    { slotId: 'center', side: 'south', neighborId: 'edge-s', neighborSide: 'north' },
    { slotId: 'center', side: 'west', neighborId: 'edge-w', neighborSide: 'east' },
    { slotId: 'edge-n', side: 'west', neighborId: 'corner-nw', neighborSide: 'east' },
    { slotId: 'edge-n', side: 'east', neighborId: 'corner-ne', neighborSide: 'west' },
    { slotId: 'edge-s', side: 'west', neighborId: 'corner-sw', neighborSide: 'east' },
    { slotId: 'edge-s', side: 'east', neighborId: 'corner-se', neighborSide: 'west' },
    { slotId: 'edge-w', side: 'north', neighborId: 'corner-nw', neighborSide: 'south' },
    { slotId: 'edge-w', side: 'south', neighborId: 'corner-sw', neighborSide: 'north' },
    { slotId: 'edge-e', side: 'north', neighborId: 'corner-ne', neighborSide: 'south' },
    { slotId: 'edge-e', side: 'south', neighborId: 'corner-se', neighborSide: 'north' },
  ],
};

const LAYOUTS: Record<PathAutotileLayoutId, PathAutotileLayout> = {
  'path-center-edges-corners-v1': PATH_CENTER_EDGES_CORNERS_V1,
};

export function pathAutotileLayout(id: PathAutotileLayoutId): PathAutotileLayout {
  return LAYOUTS[id];
}

export function slotByPosition(
  layout: PathAutotileLayout,
  column: number,
  row: number,
): PathAutotileSlot | undefined {
  return layout.slots.find((slot) => slot.column === column && slot.row === row);
}

export function slotById(
  layout: PathAutotileLayout,
  slotId: string,
): PathAutotileSlot | undefined {
  return layout.slots.find((slot) => slot.id === slotId);
}
