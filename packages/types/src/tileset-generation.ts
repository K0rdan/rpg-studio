// Style presets for tileset generation
export enum TilesetStyle {
  MEDIEVAL = 'medieval',
  CARTOON = 'cartoon',
  FANTASY = 'fantasy',
  SCI_FI = 'sci_fi',
  DUNGEON = 'dungeon',
  NATURE = 'nature',
  URBAN = 'urban',
  CUSTOM = 'custom',
}

// Common tile sizes
export const COMMON_TILE_SIZES = [16, 32, 64, 128] as const;
export type TileSize = typeof COMMON_TILE_SIZES[number];

export const PROJECT_PERSPECTIVES = ['top-down', '3/4'] as const;
export type ProjectPerspective = typeof PROJECT_PERSPECTIVES[number];

export const GENERATION_MODEL_IDS = ['gemini', 'gpt', 'claude'] as const;
export type GenerationModelId = typeof GENERATION_MODEL_IDS[number];

export const TILE_FAMILY_CATEGORIES = [
  'ground',
  'water',
  'elevation',
  'vegetation',
  'structure',
  'decoration',
] as const;
export type TileFamilyCategory = typeof TILE_FAMILY_CATEGORIES[number];

export const GENERATION_ROLES = ['family', 'transition'] as const;
export type GenerationRole = typeof GENERATION_ROLES[number];

export const GENERATION_STATUSES = ['fresh', 'stale'] as const;
export type GenerationStatus = typeof GENERATION_STATUSES[number];

export const GENERATION_MODES = ['texture', 'prop'] as const;
export type GenerationMode = typeof GENERATION_MODES[number];

export const TILING_MODES = ['individual', 'fixed-block'] as const;
export type TilingMode = typeof TILING_MODES[number];

export const GENERATION_UNAVAILABLE_REASONS = [
  'rate_limit',
  'quota',
  'not_supported',
  'misconfigured',
  'upstream',
] as const;
export type GenerationUnavailableReason =
  typeof GENERATION_UNAVAILABLE_REASONS[number];

export interface ProjectStyleSpec {
  tileSize: TileSize;
  perspective: ProjectPerspective;
  mood?: string;
}

export interface GenerationReferenceImage {
  tilesetId: string;
  mimeType: 'image/png';
  bytes: Uint8Array;
}

export interface GenerationClientRequest {
  model: GenerationModelId;
  prompt: string;
  referenceImages: GenerationReferenceImage[];
  tileSize: TileSize;
}

export interface RawGenerationResult {
  mimeType: 'image/png';
  bytes: Uint8Array;
  model: GenerationModelId;
}

export interface ProcessedGenerationResult {
  mimeType: 'image/png';
  bytes: Uint8Array;
  generationMode: GenerationMode;
  tilingMode: TilingMode;
  selfTilingScore?: number;
}

// Generation request from client
export interface TilesetGenerationRequest {
  name: string;
  tile_width: number;
  tile_height: number;
  style: TilesetStyle;
  custom_prompt?: string; // Additional prompt refinement
  reference_image_url?: string; // Optional reference from existing assets
}

// Generation metadata stored in DB
export interface TilesetGenerationMetadata {
  generated: boolean;
  style?: TilesetStyle;
  prompt?: string;
  generated_at?: Date;
  model?: GenerationModelId;
  role?: GenerationRole;
  category?: TileFamilyCategory;
  label?: string;
  status?: GenerationStatus;
  sourceFamilyIds?: string[];
  pairFamilyIds?: [string, string];
  generationMode?: GenerationMode;
  tilingMode?: TilingMode;
  selfTilingScore?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  values: T,
): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function isTrimmedString(value: unknown, maxLength?: number): value is string {
  return (
    typeof value === 'string'
    && value.length > 0
    && value === value.trim()
    && (maxLength === undefined || value.length <= maxLength)
  );
}

export function isTileSize(value: unknown): value is TileSize {
  return (
    typeof value === 'number'
    && COMMON_TILE_SIZES.includes(value as TileSize)
  );
}

export function isProjectPerspective(value: unknown): value is ProjectPerspective {
  return isOneOf(value, PROJECT_PERSPECTIVES);
}

export function isGenerationModelId(value: unknown): value is GenerationModelId {
  return isOneOf(value, GENERATION_MODEL_IDS);
}

export function isTileFamilyCategory(value: unknown): value is TileFamilyCategory {
  return isOneOf(value, TILE_FAMILY_CATEGORIES);
}

export function isGenerationRole(value: unknown): value is GenerationRole {
  return isOneOf(value, GENERATION_ROLES);
}

export function isGenerationStatus(value: unknown): value is GenerationStatus {
  return isOneOf(value, GENERATION_STATUSES);
}

export function isGenerationMode(value: unknown): value is GenerationMode {
  return isOneOf(value, GENERATION_MODES);
}

export function isTilingMode(value: unknown): value is TilingMode {
  return isOneOf(value, TILING_MODES);
}

export function isGenerationUnavailableReason(
  value: unknown,
): value is GenerationUnavailableReason {
  return isOneOf(value, GENERATION_UNAVAILABLE_REASONS);
}

export function isGenerationLabel(value: unknown): value is string {
  return isTrimmedString(value, 64);
}

export function isProjectStyleSpec(value: unknown): value is ProjectStyleSpec {
  if (!isRecord(value)) {
    return false;
  }

  const hasValidMood = (
    value.mood === undefined
    || isTrimmedString(value.mood, 200)
  );

  return (
    isTileSize(value.tileSize)
    && isProjectPerspective(value.perspective)
    && hasValidMood
  );
}

export function isGenerationReferenceImage(
  value: unknown,
): value is GenerationReferenceImage {
  return (
    isRecord(value)
    && isTrimmedString(value.tilesetId)
    && value.mimeType === 'image/png'
    && value.bytes instanceof Uint8Array
  );
}

export function isGenerationClientRequest(
  value: unknown,
): value is GenerationClientRequest {
  return (
    isRecord(value)
    && isGenerationModelId(value.model)
    && isTrimmedString(value.prompt)
    && Array.isArray(value.referenceImages)
    && value.referenceImages.every(isGenerationReferenceImage)
    && isTileSize(value.tileSize)
  );
}

export function isRawGenerationResult(value: unknown): value is RawGenerationResult {
  return (
    isRecord(value)
    && value.mimeType === 'image/png'
    && value.bytes instanceof Uint8Array
    && isGenerationModelId(value.model)
  );
}

export function isProcessedGenerationResult(
  value: unknown,
): value is ProcessedGenerationResult {
  if (
    !isRecord(value)
    || value.mimeType !== 'image/png'
    || !(value.bytes instanceof Uint8Array)
    || !isGenerationMode(value.generationMode)
    || !isTilingMode(value.tilingMode)
  ) {
    return false;
  }

  const hasValidScore = (
    value.selfTilingScore === undefined
    || (
      typeof value.selfTilingScore === 'number'
      && value.selfTilingScore >= 0
      && value.selfTilingScore <= 1
    )
  );

  return hasValidScore;
}
