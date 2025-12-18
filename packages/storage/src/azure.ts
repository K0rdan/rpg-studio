/**
 * Azure Blob Storage Implementation
 * 
 * Implementation of TilesetStorage using Azure Blob Storage.
 */

import {
  BlobServiceClient,
  ContainerClient,
  BlockBlobClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import type {
  TilesetAssetLocation,
  UploadTilesetImageParams,
  GetTilesetImageUrlParams,
  DeleteTilesetAssetsParams,
  SUPPORTED_MIME_TYPES,
} from './types';
import type { TilesetStorage } from './interface';
import type { AzureStorageOptions } from './config';
import {
  InvalidMimeTypeError,
  AssetNotFoundError,
  UploadFailedError,
  NetworkError,
  ConfigurationError,
} from './errors';

/**
 * Azure Blob Storage implementation of TilesetStorage
 */
export class AzureTilesetStorage implements TilesetStorage {
  private readonly blobServiceClient: BlobServiceClient;
  private readonly containerClient: ContainerClient;
  private readonly containerName: string;
  private readonly isPublic: boolean;
  private readonly sasExpiryHours: number;
  private readonly publicBaseUrl?: string;
  private readonly accountName: string;
  private readonly accountKey?: string;

  constructor(options: AzureStorageOptions) {
    try {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        options.connectionString
      );
      this.containerName = options.containerName || 'tilesets';
      this.containerClient = this.blobServiceClient.getContainerClient(
        this.containerName
      );
      this.isPublic = options.isPublic ?? false;
      this.sasExpiryHours = options.sasExpiryHours ?? 24;
      this.publicBaseUrl = options.publicBaseUrl;
      this.accountName = options.accountName || this.blobServiceClient.accountName;
      
      // Extract account key from connection string if not provided
      if (options.accountKey) {
        this.accountKey = options.accountKey;
      } else {
        const connectionString = options.connectionString;
        const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);
        if (accountKeyMatch) {
          this.accountKey = accountKeyMatch[1];
        }
      }
    } catch (error) {
      throw new ConfigurationError(
        `Failed to initialize Azure Storage client: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

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
   * Generate blob path from project ID and tileset ID
   */
  private getBlobPath(projectId: string, tilesetId: string, mimeType: string): string {
    const extension = this.getExtensionFromMimeType(mimeType);
    return `projects/${projectId}/tilesets/${tilesetId}.${extension}`;
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

      const blobPath = this.getBlobPath(params.projectId, params.tilesetId, params.mimeType);
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);

      // Convert data to Buffer if needed
      let buffer: Buffer;
      if (Buffer.isBuffer(params.data)) {
        buffer = params.data;
      } else if (params.data instanceof ArrayBuffer) {
        buffer = Buffer.from(params.data);
      } else {
        buffer = Buffer.from(params.data);
      }

      // Upload blob with content type
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: params.mimeType,
        },
      });

      return { storageKey: blobPath };
    } catch (error) {
      if (error instanceof InvalidMimeTypeError) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        throw new NetworkError(
          `Network error during upload: ${error.message}`,
          error
        );
      }
      throw new UploadFailedError(
        `Failed to upload tileset image: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getTilesetImageUrl(params: GetTilesetImageUrlParams): Promise<string> {
    try {
      const blobPath = params.location.storageKey;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);

      // Check if blob exists
      const exists = await blockBlobClient.exists();
      if (!exists) {
        throw new AssetNotFoundError(
          `Tileset asset not found: ${blobPath}`
        );
      }

      // If public container and public base URL is configured, use it
      if (this.isPublic && this.publicBaseUrl) {
        return `${this.publicBaseUrl}/${blobPath}`;
      }

      // If public container, return direct blob URL
      if (this.isPublic) {
        return blockBlobClient.url;
      }

      // For private containers, generate SAS URL
      if (!this.accountKey) {
        throw new ConfigurationError(
          'Unable to generate SAS token: AccountKey is required for private containers. Provide it in AzureStorageOptions or ensure it is in the connection string.'
        );
      }

      const expiryTime = new Date();
      const expirySeconds = params.expirySeconds ?? (this.sasExpiryHours * 3600);
      expiryTime.setSeconds(expiryTime.getSeconds() + expirySeconds);

      // Create shared key credential for SAS token generation
      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountName,
        this.accountKey
      );

      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: this.containerName,
          blobName: blobPath,
          permissions: BlobSASPermissions.parse('r'), // Read permission
          expiresOn: expiryTime,
        },
        sharedKeyCredential
      ).toString();

      return `${blockBlobClient.url}?${sasToken}`;
    } catch (error) {
      if (error instanceof AssetNotFoundError || error instanceof ConfigurationError) {
        throw error;
      }
      if (error instanceof Error && (error.message.includes('network') || error.message.includes('ECONNREFUSED'))) {
        throw new NetworkError(
          `Network error during URL generation: ${error.message}`,
          error
        );
      }
      throw new NetworkError(
        `Failed to generate tileset image URL: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async deleteTilesetAssets(params: DeleteTilesetAssetsParams): Promise<void> {
    try {
      // Construct blob path pattern (without extension, to catch all variants)
      const basePath = `projects/${params.projectId}/tilesets/${params.tilesetId}`;
      
      // List blobs with the prefix
      const blobs = [];
      for await (const blob of this.containerClient.listBlobsFlat({ prefix: basePath })) {
        blobs.push(blob.name);
      }

      // Delete all matching blobs (idempotent - deleteBlob doesn't error if blob doesn't exist)
      await Promise.all(
        blobs.map(async (blobName) => {
          const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
          try {
            await blockBlobClient.delete();
          } catch (error) {
            // Ignore 404 errors (blob already deleted)
            if (error instanceof Error && !error.message.includes('404')) {
              throw error;
            }
          }
        })
      );
    } catch (error) {
      if (error instanceof Error && (error.message.includes('network') || error.message.includes('ECONNREFUSED'))) {
        throw new NetworkError(
          `Network error during deletion: ${error.message}`,
          error
        );
      }
      // Deletion is idempotent, so we don't throw errors for missing blobs
      // Only throw for actual failures
      if (error instanceof Error && !error.message.includes('404')) {
        throw new NetworkError(
          `Failed to delete tileset assets: ${error.message}`,
          error
        );
      }
    }
  }
}

