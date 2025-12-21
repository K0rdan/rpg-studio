/**
 * Azure Storage Configuration
 * 
 * Configuration types and helpers for Azure Blob Storage implementation.
 */

/**
 * Configuration options for Azure Blob Storage
 */
export interface AzureStorageOptions {
  /** Azure Storage connection string (mutually exclusive with SP credentials) */
  connectionString?: string;
  /** Azure Tenant ID (for Service Principal) */
  tenantId?: string;
  /** Azure Client ID (for Service Principal) */
  clientId?: string;
  /** Azure Client Secret (for Service Principal) */
  clientSecret?: string;
  /** Container name for tileset assets (default: 'tilesets') */
  containerName?: string;
  /** Base URL for public access (optional, for CDN) */
  publicBaseUrl?: string;
  /** Whether the container is public (default: false, uses SAS tokens) */
  isPublic?: boolean;
  /** SAS token expiry in hours (default: 24) */
  sasExpiryHours?: number;
  /** Account name (required if using SP credentials) */
  accountName?: string;
  /** Account key (extracted from connection string if not provided) */
  accountKey?: string;
}

/**
 * Parse Azure Storage configuration from environment variables
 */
export function parseAzureStorageConfigFromEnv(): AzureStorageOptions {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  
  if (!connectionString && (!tenantId || !clientId || !clientSecret || !accountName)) {
    throw new Error(
      'Either AZURE_STORAGE_CONNECTION_STRING or (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_STORAGE_ACCOUNT_NAME) environment variables are required'
    );
  }

  return {
    connectionString,
    tenantId,
    clientId,
    clientSecret,
    accountName,
    containerName: process.env.AZURE_STORAGE_TILESETS_CONTAINER || 'assets',
    publicBaseUrl: process.env.AZURE_STORAGE_PUBLIC_BASE_URL,
    isPublic: process.env.AZURE_STORAGE_IS_PUBLIC === 'true',
    sasExpiryHours: process.env.AZURE_STORAGE_SAS_EXPIRY_HOURS
      ? parseInt(process.env.AZURE_STORAGE_SAS_EXPIRY_HOURS, 10)
      : 24,
  };
}

