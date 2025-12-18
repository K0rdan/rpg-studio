/**
 * Storage Error Classes
 * 
 * Error hierarchy for storage operations.
 */

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


