/**
 * In-Memory Storage Implementation
 * 
 * Test implementation that stores tileset assets in memory.
 * Useful for testing and development without requiring cloud storage.
 */

import type {
  TilesetAssetLocation,
  UploadTilesetImageParams,
  GetTilesetImageUrlParams,
  DeleteTilesetAssetsParams,
} from './types';
import { SUPPORTED_MIME_TYPES } from './types';
import type { TilesetStorage } from './interface';
import {
  InvalidMimeTypeError,
  AssetNotFoundError,
  UploadFailedError,
} from './errors';

/**
 * In-memory implementation of TilesetStorage.
 * Stores assets in a Map and generates data URLs for retrieval.
 */
export class InMemoryTilesetStorage implements TilesetStorage {
  private readonly storage: Map<string, Buffer> = new Map();

  /**
   * Validate MIME type
   */
  private validateMimeType(mimeType: string): void {
    const normalized = mimeType.toLowerCase();
    if (!SUPPORTED_MIME_TYPES.includes(normalized as any)) {
      throw new InvalidMimeTypeError(
        `Unsupported MIME type: ${mimeType}. Supported types: ${SUPPORTED_MIME_TYPES.join(', ')}`,
        mimeType,
        SUPPORTED_MIME_TYPES
      );
    }
  }

  /**
   * Generate storage key from project ID and tileset ID
   */
  private getStorageKey(userId: string, projectId: string, tilesetId: string): string {
    return `users/${userId}/projects/${projectId}/tilesets/${tilesetId}`;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const normalized = mimeType.toLowerCase();
    const map: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpeg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
    };
    return map[normalized] || 'png';
  }

  async uploadTilesetImage(params: UploadTilesetImageParams): Promise<TilesetAssetLocation> {
    try {
      this.validateMimeType(params.mimeType);

      // Convert data to Buffer if needed
      let buffer: Buffer;
      if (Buffer.isBuffer(params.data)) {
        buffer = params.data;
      } else if (params.data instanceof ArrayBuffer) {
        buffer = Buffer.from(params.data);
      } else {
        buffer = Buffer.from(params.data);
      }

      const storageKey = `${this.getStorageKey(params.userId, params.projectId, params.tilesetId)}.${this.getExtensionFromMimeType(params.mimeType)}`;
      
      this.storage.set(storageKey, buffer);

      return { storageKey };
    } catch (error) {
      if (error instanceof InvalidMimeTypeError) {
        throw error;
      }
      throw new UploadFailedError(
        `Failed to upload tileset image: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getTilesetImageUrl(params: GetTilesetImageUrlParams): Promise<string> {
    const buffer = this.storage.get(params.location.storageKey);
    
    if (!buffer) {
      throw new AssetNotFoundError(
        `Tileset asset not found: ${params.location.storageKey}`
      );
    }

    // Generate data URL
    const base64 = buffer.toString('base64');
    const mimeType = this.getMimeTypeFromStorageKey(params.location.storageKey);
    return `data:${mimeType};base64,${base64}`;
  }

  async deleteTilesetAssets(params: DeleteTilesetAssetsParams): Promise<void> {
    const prefix = this.getStorageKey(params.userId, params.projectId, params.tilesetId);
    
    // Find all keys matching the prefix
    const keysToDelete: string[] = [];
    const keys = Array.from(this.storage.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    // Delete all matching keys (idempotent - no error if already deleted)
    for (const key of keysToDelete) {
      this.storage.delete(key);
    }
  }

  /**
   * Infer MIME type from storage key extension
   */
  private getMimeTypeFromStorageKey(storageKey: string): string {
    const ext = storageKey.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      'png': 'image/png',
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'webp': 'image/webp',
    };
    return map[ext || ''] || 'image/png';
  }

  /**
   * Clear all stored assets (useful for testing)
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Get the number of stored assets (useful for testing)
   */
  size(): number {
    return this.storage.size;
  }
}


