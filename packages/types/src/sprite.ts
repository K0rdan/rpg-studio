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
}

/**
 * Standard RPG Maker-style charset animation map.
 * Assumes a 4-col × 4-row spritesheet (128×256 px at 32×64 per frame).
 *
 * Row 0: walk_down  → frames [0, 1, 2, 3]
 * Row 1: walk_left  → frames [4, 5, 6, 7]
 * Row 2: walk_right → frames [8, 9, 10, 11]
 * Row 3: walk_up    → frames [12, 13, 14, 15]
 * idle              → centre frame of walk_down (index 1)
 */
export const DEFAULT_CHARSET_ANIMATIONS: Record<string, number[]> = {
  idle:       [1],
  walk_down:  [0, 1, 2, 3],
  walk_left:  [4, 5, 6, 7],
  walk_right: [8, 9, 10, 11],
  walk_up:    [12, 13, 14, 15],
};
