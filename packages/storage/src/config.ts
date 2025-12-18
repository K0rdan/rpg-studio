/**
 * Azure Storage Configuration
 * 
 * Configuration types and helpers for Azure Blob Storage implementation.
 */

/**
 * Configuration options for Azure Blob Storage
 */
export interface AzureStorageOptions {
  /** Azure Storage connection string */
  connectionString: string;
  /** Container name for tileset assets (default: 'tilesets') */
  containerName?: string;
  /** Base URL for public access (optional, for CDN) */
  publicBaseUrl?: string;
  /** Whether the container is public (default: false, uses SAS tokens) */
  isPublic?: boolean;
  /** SAS token expiry in hours (default: 24) */
  sasExpiryHours?: number;
  /** Account name (extracted from connection string if not provided) */
  accountName?: string;
  /** Account key (extracted from connection string if not provided) */
  accountKey?: string;
}

/**
 * Parse Azure Storage configuration from environment variables
 */
export function parseAzureStorageConfigFromEnv(): AzureStorageOptions {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connectionString) {
    throw new Error(
      'AZURE_STORAGE_CONNECTION_STRING environment variable is required'
    );
  }

  return {
    connectionString,
    containerName: process.env.AZURE_STORAGE_TILESETS_CONTAINER || 'tilesets',
    publicBaseUrl: process.env.AZURE_STORAGE_PUBLIC_BASE_URL,
    isPublic: process.env.AZURE_STORAGE_IS_PUBLIC === 'true',
    sasExpiryHours: process.env.AZURE_STORAGE_SAS_EXPIRY_HOURS
      ? parseInt(process.env.AZURE_STORAGE_SAS_EXPIRY_HOURS, 10)
      : 24,
  };
}

