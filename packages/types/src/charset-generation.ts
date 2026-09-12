export enum CharsetStyle {
  MEDIEVAL = 'medieval',
  CARTOON = 'cartoon',
  FANTASY = 'fantasy',
  SCI_FI = 'sci_fi',
  MODERN = 'modern',
  CUSTOM = 'custom',
}

export const CHARSET_GRID_COLUMNS = 3;
export const CHARSET_GRID_ROWS = 4;
export const MIN_CHARSET_FRAME_DIMENSION = 1;
export const MAX_CHARSET_FRAME_DIMENSION = 512;
export const DEFAULT_CHARSET_FRAME_SIZE = {
  width: 32,
  height: 64,
} as const;

/**
 * Common examples retained for consumers that want presets. Charset frame
 * width and height are not restricted to these pairs.
 */
export const COMMON_CHARSET_FRAME_SIZES = [
  { width: 16, height: 32 },
  { width: 32, height: 64 },
  { width: 48, height: 48 },
  { width: 48, height: 96 },
  { width: 96, height: 96 },
  { width: 64, height: 128 },
] as const;

export function isValidCharsetFrameDimension(value: unknown): value is number {
  return (
    typeof value === 'number'
    && Number.isInteger(value)
    && value >= MIN_CHARSET_FRAME_DIMENSION
    && value <= MAX_CHARSET_FRAME_DIMENSION
  );
}

export interface CharsetGenerationRequest {
  name: string;
  frame_width: number;
  frame_height: number;
  style: CharsetStyle;
  custom_prompt?: string;
}

export interface CharsetGenerationMetadata {
  generated: boolean;
  style?: CharsetStyle;
  prompt?: string;
  generated_at?: Date;
}
