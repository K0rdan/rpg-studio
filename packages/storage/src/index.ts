/**
 * Storage Abstraction Package
 * 
 * Provides interfaces, types, and implementations for tileset asset storage.
 * Includes both in-memory (testing) and Azure Blob Storage implementations.
 */

// Types
export type {
  TilesetAssetLocation,
  UploadTilesetImageParams,
  GetTilesetImageUrlParams,
  DeleteTilesetAssetsParams,
  SupportedMimeType,
} from './types';

export { SUPPORTED_MIME_TYPES } from './types';

// Interface
export type { TilesetStorage } from './interface';

// Errors
export {
  StorageError,
  AssetNotFoundError,
  InvalidMimeTypeError,
  UploadFailedError,
  NetworkError,
  ConfigurationError,
  StorageErrorCode,
} from './errors';

// In-memory implementation (for testing)
export { InMemoryTilesetStorage } from './in-memory';

// Azure implementation
export { AzureTilesetStorage } from './azure';
export type { AzureStorageOptions } from './config';
export { parseAzureStorageConfigFromEnv } from './config';


