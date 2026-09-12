import {
  CHARSET_GRID_COLUMNS,
  CHARSET_GRID_ROWS,
  type CharsetGenerationMetadata,
} from './charset-generation';

export interface Sprite {
  id: string;
  name: string;
  /** Full URL of the spritesheet image (pre-signed URL from storage) */
  image_source: string;
  /** Width of a single animation frame in pixels */
  frame_width: number;
  /** Height of a single animation frame in pixels */
  frame_height: number;
  /**
   * Named animation states mapped to flat frame indices.
   * Frame index = row * cols + col (row-major).
   */
  animations: Record<string, number[]>;
  /** Azure Blob storage key (e.g. "sprites/projectId/hero.png") */
  storageKey?: string;
  /** Project this sprite belongs to */
  projectId?: string;
  /** ISO timestamp when the sprite was created */
  createdAt?: string;
  /** Metadata describing how this sprite was generated, when applicable. */
  generation_metadata?: CharsetGenerationMetadata;
}

/**
 * Standard RPG Maker-style charset animation map.
 * Assumes a configurable-frame 3-column × 4-row spritesheet. For example,
 * 48×48 px frames produce a 144×192 px sheet and 96×96 px frames produce
 * a 288×384 px sheet.
 *
 * Row 0: walk_down  → frames [0, 1, 2]
 * Row 1: walk_left  → frames [3, 4, 5]
 * Row 2: walk_right → frames [6, 7, 8]
 * Row 3: walk_up    → frames [9, 10, 11]
 * idle              → centre frame of walk_down (index 1)
 */
export const DEFAULT_CHARSET_ANIMATIONS: Record<string, number[]> = {
  idle:       [1],
  walk_down:  [0, 1, 2],
  walk_left:  [3, 4, 5],
  walk_right: [6, 7, 8],
  walk_up:    [9, 10, 11],
};

export const DEFAULT_CHARSET_GRID = {
  columns: CHARSET_GRID_COLUMNS,
  rows: CHARSET_GRID_ROWS,
} as const;
