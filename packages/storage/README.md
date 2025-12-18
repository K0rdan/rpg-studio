# @packages/storage

Storage abstraction for tileset assets with implementations for Azure Blob Storage and in-memory storage (for testing).

## Features

- **Abstraction Layer**: Clean interface (`TilesetStorage`) that hides infrastructure details
- **Azure Blob Storage**: Production-ready implementation using Azure Storage
- **In-Memory Storage**: Test implementation for unit testing without cloud dependencies
- **Type Safety**: Full TypeScript support with comprehensive error types
- **Flexible Configuration**: Supports both public and private containers with SAS tokens

## Installation

```bash
npm install @packages/storage
```

## Usage

### Azure Blob Storage (Production)

```typescript
import { AzureTilesetStorage, parseAzureStorageConfigFromEnv } from '@packages/storage';

// Option 1: From environment variables
const storage = new AzureTilesetStorage(parseAzureStorageConfigFromEnv());

// Option 2: Manual configuration
const storage = new AzureTilesetStorage({
  connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
  containerName: 'tilesets',
  isPublic: false, // Use SAS tokens
  sasExpiryHours: 24,
});

// Upload a tileset image
const location = await storage.uploadTilesetImage({
  projectId: 'proj-123',
  tilesetId: 'ts-456',
  mimeType: 'image/png',
  data: imageBuffer,
});

// Get URL for the image
const url = await storage.getTilesetImageUrl({ location });
// Returns: https://account.blob.core.windows.net/tilesets/projects/proj-123/tilesets/ts-456.png?sv=...

// Delete tileset assets
await storage.deleteTilesetAssets({
  projectId: 'proj-123',
  tilesetId: 'ts-456',
});
```

### In-Memory Storage (Testing)

```typescript
import { InMemoryTilesetStorage } from '@packages/storage';

const storage = new InMemoryTilesetStorage();

// Same API as Azure implementation
const location = await storage.uploadTilesetImage({
  projectId: 'proj-123',
  tilesetId: 'ts-456',
  mimeType: 'image/png',
  data: imageBuffer,
});

const url = await storage.getTilesetImageUrl({ location });
// Returns: data:image/png;base64,...

// Clear storage (useful for test cleanup)
storage.clear();
```

## Environment Variables

For Azure Storage, configure these environment variables:

- `AZURE_STORAGE_CONNECTION_STRING` (required): Azure Storage connection string
- `AZURE_STORAGE_TILESETS_CONTAINER` (optional, default: `tilesets`): Container name
- `AZURE_STORAGE_IS_PUBLIC` (optional, default: `false`): Set to `true` for public containers
- `AZURE_STORAGE_SAS_EXPIRY_HOURS` (optional, default: `24`): SAS token expiry in hours
- `AZURE_STORAGE_PUBLIC_BASE_URL` (optional): CDN base URL for public containers

## Supported MIME Types

- `image/png`
- `image/jpeg`
- `image/jpg`
- `image/webp`

## Error Handling

All storage operations throw typed errors:

```typescript
import {
  StorageError,
  AssetNotFoundError,
  InvalidMimeTypeError,
  UploadFailedError,
  NetworkError,
  ConfigurationError,
} from '@packages/storage';

try {
  await storage.uploadTilesetImage({ ... });
} catch (error) {
  if (error instanceof InvalidMimeTypeError) {
    console.error('Unsupported image format:', error.providedMimeType);
  } else if (error instanceof NetworkError) {
    console.error('Network issue:', error.message);
  } else if (error instanceof StorageError) {
    console.error('Storage error:', error.code, error.message);
  }
}
```

## Blob Naming Convention

Tileset images are stored using the following path pattern:

```
projects/{projectId}/tilesets/{tilesetId}.{extension}
```

Examples:
- `projects/proj-123/tilesets/ts-456.png`
- `projects/proj-123/tilesets/ts-789.jpg`

## Architecture

The package follows a clean architecture pattern:

- **Interfaces** (`interface.ts`): Core `TilesetStorage` interface
- **Types** (`types.ts`): Type definitions and parameters
- **Errors** (`errors.ts`): Error class hierarchy
- **Implementations**:
  - `in-memory.ts`: In-memory storage for testing
  - `azure.ts`: Azure Blob Storage implementation

Consumers depend only on the `TilesetStorage` interface, allowing easy swapping of implementations.

