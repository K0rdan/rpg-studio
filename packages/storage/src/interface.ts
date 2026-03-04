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

  /**
   * Upload a file to an explicit storage key (path).
   *
   * Unlike `uploadTilesetImage`, this method does NOT own the path convention —
   * the caller provides the full key, e.g. `users/{uid}/projects/{pid}/sprites/{id}.png`.
   * Use this for asset types that don't fit the tileset folder structure.
   *
   * @param storageKey Full blob path (e.g. "users/uid/projects/pid/sprites/sid.png")
   * @param data       File data as Buffer or ArrayBuffer
   * @param mimeType   MIME type of the file
   * @returns          The same storageKey, for convenience
   * @throws InvalidMimeTypeError if mimeType is not supported
   * @throws UploadFailedError if upload fails
   * @throws NetworkError if network operation fails
   */
  uploadFile(storageKey: string, data: Buffer | ArrayBuffer, mimeType: string): Promise<string>;

  /**
   * Delete a single file at an explicit storage key.
   *
   * Counterpart to `uploadFile` — the caller provides the full path.
   * This operation is idempotent (no error if the file doesn't exist).
   *
   * @param storageKey Full blob path (e.g. "users/uid/projects/pid/sprites/sid.png")
   * @throws NetworkError if a network failure prevents the operation
   */
  deleteFile(storageKey: string): Promise<void>;
}


