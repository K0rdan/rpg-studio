/**
 * Storage Bootstrap
 * 
 * Initializes and configures the storage abstraction for tileset assets.
 * Uses Azure Storage in production, can be swapped for in-memory storage in tests.
 */

import {
  AzureTilesetStorage,
  InMemoryTilesetStorage,
  parseAzureStorageConfigFromEnv,
  type TilesetStorage,
} from '@packages/storage';

let storageInstance: TilesetStorage | null = null;

/**
 * Get the configured tileset storage instance.
 * 
 * In production, returns AzureTilesetStorage configured from environment variables.
 * In test environment, returns InMemoryTilesetStorage.
 * 
 * @returns TilesetStorage instance
 */
export function getTilesetStorage(): TilesetStorage {
  if (storageInstance) {
    return storageInstance;
  }

  // Use in-memory storage for tests
  if (process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_STORAGE === 'true') {
    storageInstance = new InMemoryTilesetStorage();
    return storageInstance;
  }

  // Use Azure Storage in production/development
  try {
    const config = parseAzureStorageConfigFromEnv();
    storageInstance = new AzureTilesetStorage(config);
    return storageInstance;
  } catch (error) {
    // If Azure config is not available, fall back to in-memory
    // This allows development without Azure credentials
    console.warn('Azure Storage configuration not available, using in-memory storage:', error);
    storageInstance = new InMemoryTilesetStorage();
    return storageInstance;
  }
}

/**
 * Reset the storage instance (useful for testing)
 */
export function resetStorageInstance(): void {
  storageInstance = null;
}


