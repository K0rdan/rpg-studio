# Implementation Plan: Storage Abstraction Package

**Branch**: `005-package-storage` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)

## Summary

This plan outlines the implementation of a storage abstraction layer for tileset assets. The abstraction will support Azure Blob Storage as the primary implementation while allowing for alternative implementations (in-memory for testing, local filesystem for development). The design follows a clean architecture pattern where the abstraction package has no infrastructure dependencies, and the Azure implementation is isolated in a separate package.

## Technical Context

**Language/Version**: TypeScript  
**Primary Dependencies**: 
- `packages/storage`: No external dependencies (pure interfaces)
- `packages/storage-azure`: `@azure/storage-blob` SDK
**Storage**: Azure Blob Storage (via abstraction)  
**Testing**: Jest  
**Target Platform**: Node.js (server-side)  
**Project Type**: Monorepo packages  
**Performance Goals**: 
- URL generation under 100ms
- Upload operations support up to 10MB files
**Constraints**: 
- Zero Azure dependencies in abstraction package
- Must support easy swapping of implementations
- Must be testable without Azure infrastructure
**Scale/Scope**: Initial scope focuses on tileset images. Architecture supports future expansion to other asset types (maps, sprites, etc.).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Respect for Types**: **Pass**. Storage types (`TilesetAssetLocation`, interfaces) will be defined in `packages/storage`. Existing `Tileset` type remains unchanged.
- **Principle II: Separation of Concerns**: **Pass**. Abstraction (`packages/storage`) is pure interfaces. Azure implementation (`packages/storage-azure`) is isolated. Editor uses abstraction only.
- **Principle III: Lightweight Player**: **Pass**. Player receives URLs from API. No storage logic in player.
- **Principle IV: Prioritize Native Canvas**: **Pass**. URLs work directly with `Image` objects and canvas.
- **Principle V: Test-Driven Development (TDD)**: **Pass**. In-memory implementation enables comprehensive testing without Azure.

## Project Structure

### Documentation (this feature)

```text
specs/005-package-storage/
├── plan.md              # This file
├── spec.md              # Feature specification
├── tasks.md             # Implementation tasks
└── contracts/           # TypeScript interfaces and types
    └── storage.ts       # Core storage contracts
```

### Source Code (repository root)

```text
packages/
├── storage/              # NEW: Storage abstraction with implementations
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts     # Public exports
│       ├── types.ts     # TilesetAssetLocation and related types
│       ├── interface.ts # TilesetStorage interface
│       ├── errors.ts    # Storage error classes
│       ├── in-memory.ts # In-memory implementation (for testing)
│       ├── azure.ts     # Azure Blob Storage implementation
│       └── config.ts    # Azure configuration types
└── types/               # Existing: Domain types (Tileset, etc.)
```

**Structure Decision**: Single package containing both abstraction and implementations. The abstraction interfaces are at the top level, with implementations in separate files. This simplifies the structure while maintaining clean separation of concerns. Consumers depend only on the `TilesetStorage` interface, allowing easy swapping of implementations.

## Architecture Design

### Layer 1: Abstraction (`packages/storage`)

**Purpose**: Define the contract for tileset storage operations.

**Contents**:
- `TilesetAssetLocation`: Opaque type containing `storageKey: string`
- `TilesetStorage`: Interface with methods:
  - `uploadTilesetImage(params): Promise<TilesetAssetLocation>`
  - `getTilesetImageUrl(params): Promise<string>`
  - `deleteTilesetAssets(params): Promise<void>`
- Error classes: `StorageError`, `AssetNotFoundError`, `InvalidMimeTypeError`, etc.

**Dependencies**: None (pure TypeScript interfaces and types)

### Layer 2: Azure Implementation (`packages/storage/src/azure.ts`)

**Purpose**: Implement `TilesetStorage` using Azure Blob Storage.

**Contents**:
- `AzureTilesetStorage`: Implements `TilesetStorage`
- `AzureStorageOptions`: Configuration interface
- Blob naming convention: `projects/{projectId}/tilesets/{tilesetId}.{ext}`
- SAS token generation for private containers
- Public URL construction for public containers

**Dependencies**: 
- `@azure/storage-blob` (Azure SDK)

**Configuration** (environment variables):
- `AZURE_STORAGE_CONNECTION_STRING` (or `AZURE_STORAGE_ACCOUNT` + `AZURE_STORAGE_KEY`)
- `AZURE_STORAGE_TILESETS_CONTAINER` (default: `tilesets`)
- `AZURE_STORAGE_SAS_EXPIRY_HOURS` (default: 24)
- `AZURE_STORAGE_PUBLIC_BASE_URL` (optional, for CDN)

### Layer 3: In-Memory Implementation (`packages/storage/src/in-memory.ts`)

**Purpose**: Test implementation that stores assets in memory.

**Contents**:
- `InMemoryTilesetStorage`: Implements `TilesetStorage`
- Stores blobs in a `Map<string, Buffer>`
- Generates `data:` URLs for image retrieval

**Dependencies**: None (pure TypeScript)

## Blob Naming Convention

**Pattern**: `projects/{projectId}/tilesets/{tilesetId}.{extension}`

**Examples**:
- `projects/proj-123/tilesets/ts-456.png`
- `projects/proj-123/tilesets/ts-789.jpg`

**Rationale**:
- Organized by project for easy cleanup
- Clear separation of asset types (tilesets)
- Includes extension for MIME type inference
- Supports future expansion (e.g., `projects/{projectId}/sprites/{spriteId}.png`)

## Access Patterns

### Public Container (Recommended for Development)

- Container is configured as public read access
- URLs are simple: `https://{account}.blob.core.windows.net/{container}/{blobPath}`
- No SAS tokens needed
- Fast and simple

### Private Container with SAS Tokens (Recommended for Production)

- Container is private
- `getTilesetImageUrl()` generates SAS URLs with expiry
- Default expiry: 24 hours (configurable)
- More secure but requires token generation on each request

## Error Handling Strategy

**Error Hierarchy**:
```
StorageError (base)
├── AssetNotFoundError
├── InvalidMimeTypeError
├── UploadFailedError
├── NetworkError
└── ConfigurationError
```

**Error Properties**:
- `message`: Human-readable error message
- `code`: Machine-readable error code
- `cause?`: Original error (if wrapped)

## Testing Strategy

### Unit Tests

- **Abstraction**: Test interface contracts (compile-time checks)
- **Azure Implementation**: Mock Azure SDK, test blob operations
- **In-Memory Implementation**: Test all operations with in-memory storage

### Integration Tests (Optional)

- Use Azure Storage Emulator or test account
- Test actual blob upload/download/delete operations
- Verify SAS token generation

### Consumer Tests

- Editor API routes can use `InMemoryTilesetStorage` for tests
- No Azure dependencies in test suites

## Migration Path

**Current State**: Tilesets use `image_source: string` pointing to `/public` files or URLs.

**Future State**: 
1. Editor API routes use `TilesetStorage` to upload tileset images
2. `Tileset.image_source` is populated with storage URLs
3. Existing tilesets can be migrated by uploading to storage

**Backward Compatibility**: 
- `Tileset.image_source` remains a string (can be local path or storage URL)
- Editor can handle both local and storage URLs
- Gradual migration is possible

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |


