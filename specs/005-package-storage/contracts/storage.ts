/**
 * Storage Abstraction Contracts
 * 
 * This file defines the TypeScript interfaces and types for the storage abstraction.
 * These contracts ensure type safety and consistency across all storage implementations.
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
 * Main interface for tileset storage operations.
 * All storage implementations must implement this interface.
 */
export interface TilesetStorage {
  /**
   * Upload a tileset image to storage.
   * 
   * @param params Upload parameters
   * @returns Promise resolving to the storage location identifier
   * @throws InvalidMimeTypeError if mimeType is not supported
   * @throws UploadFailedError if upload fails
   * @throws NetworkError if network operation fails
   */
  uploadTilesetImage(params: UploadTilesetImageParams): Promise<TilesetAssetLocation>;

  /**
   * Get a URL for accessing a tileset image.
   * 
   * @param params URL retrieval parameters
   * @returns Promise resolving to a URL string that can be used in <img> tags or canvas
   * @throws AssetNotFoundError if the asset does not exist
   * @throws NetworkError if network operation fails
   */
  getTilesetImageUrl(params: GetTilesetImageUrlParams): Promise<string>;

  /**
   * Delete all assets associated with a tileset.
   * 
   * @param params Deletion parameters
   * @returns Promise that resolves when deletion is complete
   * @note This operation should be idempotent (no error if assets don't exist)
   */
  deleteTilesetAssets(params: DeleteTilesetAssetsParams): Promise<void>;
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

/**
 * Error codes for storage operations
 */
export enum StorageErrorCode {
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',
  INVALID_MIME_TYPE = 'INVALID_MIME_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Base class for all storage-related errors
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'StorageError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageError);
    }
  }
}

/**
 * Error thrown when an asset is not found in storage
 */
export class AssetNotFoundError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, StorageErrorCode.ASSET_NOT_FOUND, cause);
    this.name = 'AssetNotFoundError';
  }
}

/**
 * Error thrown when an unsupported MIME type is provided
 */
export class InvalidMimeTypeError extends StorageError {
  constructor(
    message: string,
    public readonly providedMimeType: string,
    public readonly supportedMimeTypes: readonly string[]
  ) {
    super(message, StorageErrorCode.INVALID_MIME_TYPE);
    this.name = 'InvalidMimeTypeError';
  }
}

/**
 * Error thrown when an upload operation fails
 */
export class UploadFailedError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, StorageErrorCode.UPLOAD_FAILED, cause);
    this.name = 'UploadFailedError';
  }
}

/**
 * Error thrown when a network operation fails
 */
export class NetworkError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, StorageErrorCode.NETWORK_ERROR, cause);
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown when storage configuration is invalid
 */
export class ConfigurationError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, StorageErrorCode.CONFIGURATION_ERROR, cause);
    this.name = 'ConfigurationError';
  }
}


