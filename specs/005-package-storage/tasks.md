# Tasks: Storage Abstraction Package

**Branch**: `005-package-storage` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This document breaks down the implementation of the Storage Abstraction Package feature into actionable tasks.

> ✅ **Implementation Status**: `packages/storage` is fully implemented. Azure implementation, in-memory implementation, error hierarchy, and interface are all in place.

## Phase 1: Package Setup

- [x] T001 Create `packages/storage` directory structure
- [x] T002 Create `packages/storage/package.json`
- [x] T003 Create `packages/storage/tsconfig.json`
- [x] T004 Create `packages/storage-azure` directory structure *(Azure implementation lives inside `packages/storage/src/azure.ts`)*
- [ ] T005 Create `packages/storage-azure/package.json` with Azure SDK dependency *(Azure SDK installed directly in `packages/storage`)*
- [x] T006 Create `packages/storage-azure/tsconfig.json`
- [x] T007 Update root `package.json` workspaces to include new packages

## Phase 2: Storage Abstraction (`packages/storage`)

- [x] T008 [P] Define `TilesetAssetLocation` type in `packages/storage/src/types.ts`
- [x] T009 [P] Define storage operation parameter types in `packages/storage/src/types.ts`
- [x] T010 [P] Create error class hierarchy in `packages/storage/src/errors.ts`
  - [x] T010a `StorageError` base class
  - [x] T010b `AssetNotFoundError`
  - [x] T010c `InvalidMimeTypeError`
  - [x] T010d `UploadFailedError`
  - [x] T010e `NetworkError`
  - [x] T010f `ConfigurationError`
- [x] T011 [P] Define `TilesetStorage` interface in `packages/storage/src/interface.ts`
  - [x] T011a `uploadTilesetImage()` method signature
  - [x] T011b `getTilesetImageUrl()` method signature
  - [x] T011c `deleteTilesetAssets()` method signature
- [x] T012 [P] Create `packages/storage/src/index.ts` with public exports
- [x] T013 [P] Implement `InMemoryTilesetStorage` class in `packages/storage/src/in-memory.ts`
  - [x] T013a Implement `uploadTilesetImage()`
  - [x] T013b Implement `getTilesetImageUrl()` (generate data URLs)
  - [x] T013c Implement `deleteTilesetAssets()`
- [x] T014 [P] Export `InMemoryTilesetStorage` from `packages/storage/src/index.ts`

## Phase 3: Azure Implementation

- [x] T015 [P] Install `@azure/storage-blob` dependency
- [x] T016 [P] Define `AzureStorageOptions` interface in `packages/storage/src/config.ts`
- [x] T017 [P] Create `AzureTilesetStorage` class in `packages/storage/src/azure.ts`
- [x] T018 [P] Implement Azure BlobServiceClient initialization in constructor
- [x] T019 [P] Implement `uploadTilesetImage()` method
  - [x] T019a Validate MIME type
  - [x] T019b Construct blob path using naming convention
  - [x] T019c Upload blob using BlockBlobClient
  - [x] T019d Return `TilesetAssetLocation`
- [x] T020 [P] Implement `getTilesetImageUrl()` method
  - [x] T020a Support public container URLs
  - [x] T020b Support private container with SAS token generation (User Delegation SAS)
  - [x] T020c Handle CDN base URL override
- [x] T021 [P] Implement `deleteTilesetAssets()` method
  - [x] T021a Construct blob path pattern
  - [x] T021b Delete blob(s) matching pattern
  - [x] T021c Handle idempotent deletion
- [x] T022 [P] Create `packages/storage/src/index.ts` with public exports
- [x] T023 [P] Add helper function to parse connection string and create options

## Phase 4: Testing

- [ ] T024 [Test] Write unit tests for `InMemoryTilesetStorage`
- [ ] T025 [Test] Write unit tests for `AzureTilesetStorage` (with mocked Azure SDK)
- [ ] T026 [Test] Write integration tests for error classes
- [ ] T027 [Test] Verify abstraction package has zero runtime dependencies

## Phase 5: Documentation & Contracts

- [ ] T028 [Doc] Create `specs/005-package-storage/contracts/storage.ts` with TypeScript contracts
- [ ] T029 [Doc] Add JSDoc comments to all public interfaces and methods
- [ ] T030 [Doc] Create README.md in `packages/storage` with usage examples

## Phase 6: Integration Preparation

- [ ] T032 [Integration] Create example bootstrap code showing how to initialize storage
- [ ] T033 [Integration] Document environment variables required for Azure
- [ ] T034 [Integration] Create example API route handler using storage abstraction
