/**
 * Storage Types
 * 
 * Core types for the storage abstraction layer.
 */

/**
 * Opaque identifier representing the location of a tileset asset in storage.
 * The storageKey is implementation-specific and should not be parsed by consumers.
 */
export interface TilesetAssetLocation {
  /** Implementation-specific storage key (e.g., blob path, object key) */
  storageKey: string;
}

/**
 * Parameters for uploading a tileset image
 */
export interface UploadTilesetImageParams {
  /** Project ID that owns this tileset */
  projectId: string;
  /** Tileset ID */
  tilesetId: string;
  /** MIME type of the image (e.g., 'image/png', 'image/jpeg') */
  mimeType: string;
  /** Image data as Buffer, ArrayBuffer, or Uint8Array */
  data: Buffer | ArrayBuffer | Uint8Array;
}

/**
 * Parameters for retrieving a tileset image URL
 */
export interface GetTilesetImageUrlParams {
  /** Storage location identifier */
  location: TilesetAssetLocation;
  /** Optional: URL expiry in seconds (for SAS tokens). Defaults to implementation default. */
  expirySeconds?: number;
}

/**
 * Parameters for deleting tileset assets
 */
export interface DeleteTilesetAssetsParams {
  /** Project ID that owns the tileset */
  projectId: string;
  /** Tileset ID */
  tilesetId: string;
}

/**
 * Supported MIME types for tileset images
 */
export const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
] as const;

export type SupportedMimeType = typeof SUPPORTED_MIME_TYPES[number];


