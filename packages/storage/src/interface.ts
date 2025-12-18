/**
 * Storage Interface
 * 
 * Main interface for tileset storage operations.
 * All storage implementations must implement this interface.
 */

import type {
  TilesetAssetLocation,
  UploadTilesetImageParams,
  GetTilesetImageUrlParams,
  DeleteTilesetAssetsParams,
} from './types';
import type {
  AssetNotFoundError,
  InvalidMimeTypeError,
  UploadFailedError,
  NetworkError,
} from './errors';

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


