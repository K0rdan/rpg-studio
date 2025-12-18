# Tasks: Storage Abstraction Package

**Branch**: `005-package-storage` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This document breaks down the implementation of the Storage Abstraction Package feature into actionable tasks.

## Phase 1: Package Setup

- [ ] T001 Create `packages/storage` directory structure
- [ ] T002 Create `packages/storage/package.json` with zero dependencies
- [ ] T003 Create `packages/storage/tsconfig.json`
- [ ] T004 Create `packages/storage-azure` directory structure
- [ ] T005 Create `packages/storage-azure/package.json` with Azure SDK dependency
- [ ] T006 Create `packages/storage-azure/tsconfig.json`
- [ ] T007 Update root `package.json` workspaces to include new packages

## Phase 2: Storage Abstraction (`packages/storage`)

- [ ] T008 [P] Define `TilesetAssetLocation` type in `packages/storage/src/types.ts`
- [ ] T009 [P] Define storage operation parameter types in `packages/storage/src/types.ts`
- [ ] T010 [P] Create error class hierarchy in `packages/storage/src/errors.ts`
  - [ ] T010a `StorageError` base class
  - [ ] T010b `AssetNotFoundError`
  - [ ] T010c `InvalidMimeTypeError`
  - [ ] T010d `UploadFailedError`
  - [ ] T010e `NetworkError`
  - [ ] T010f `ConfigurationError`
- [ ] T011 [P] Define `TilesetStorage` interface in `packages/storage/src/interface.ts`
  - [ ] T011a `uploadTilesetImage()` method signature
  - [ ] T011b `getTilesetImageUrl()` method signature
  - [ ] T011c `deleteTilesetAssets()` method signature
- [ ] T012 [P] Create `packages/storage/src/index.ts` with public exports
- [ ] T013 [P] Implement `InMemoryTilesetStorage` class in `packages/storage/src/in-memory.ts`
  - [ ] T013a Implement `uploadTilesetImage()`
  - [ ] T013b Implement `getTilesetImageUrl()` (generate data URLs)
  - [ ] T013c Implement `deleteTilesetAssets()`
- [ ] T014 [P] Export `InMemoryTilesetStorage` from `packages/storage/src/index.ts`

## Phase 3: Azure Implementation (`packages/storage-azure`)

- [ ] T015 [P] Install `@azure/storage-blob` dependency
- [ ] T016 [P] Define `AzureStorageOptions` interface in `packages/storage-azure/src/config.ts`
- [ ] T017 [P] Create `AzureTilesetStorage` class skeleton in `packages/storage-azure/src/AzureTilesetStorage.ts`
- [ ] T018 [P] Implement Azure BlobServiceClient initialization in constructor
- [ ] T019 [P] Implement `uploadTilesetImage()` method
  - [ ] T019a Validate MIME type
  - [ ] T019b Construct blob path using naming convention
  - [ ] T019c Upload blob using BlockBlobClient
  - [ ] T019d Return `TilesetAssetLocation`
- [ ] T020 [P] Implement `getTilesetImageUrl()` method
  - [ ] T020a Support public container URLs
  - [ ] T020b Support private container with SAS token generation
  - [ ] T020c Handle CDN base URL override
- [ ] T021 [P] Implement `deleteTilesetAssets()` method
  - [ ] T021a Construct blob path pattern
  - [ ] T021b Delete blob(s) matching pattern
  - [ ] T021c Handle idempotent deletion (no error if not found)
- [ ] T022 [P] Create `packages/storage-azure/src/index.ts` with public exports
- [ ] T023 [P] Add helper function to parse connection string and create options

## Phase 4: Testing

- [ ] T024 [Test] Write unit tests for `InMemoryTilesetStorage`
  - [ ] T024a Test `uploadTilesetImage()`
  - [ ] T024b Test `getTilesetImageUrl()`
  - [ ] T024c Test `deleteTilesetAssets()`
  - [ ] T024d Test error cases (invalid MIME type, etc.)
- [ ] T025 [Test] Write unit tests for `AzureTilesetStorage` (with mocked Azure SDK)
  - [ ] T025a Test `uploadTilesetImage()` with mocked upload
  - [ ] T025b Test `getTilesetImageUrl()` with mocked SAS generation
  - [ ] T025c Test `deleteTilesetAssets()` with mocked delete
  - [ ] T025d Test error handling
- [ ] T026 [Test] Write integration tests for error classes
- [ ] T027 [Test] Verify abstraction package has zero runtime dependencies

## Phase 5: Documentation & Contracts

- [ ] T028 [Doc] Create `specs/005-package-storage/contracts/storage.ts` with TypeScript contracts
- [ ] T029 [Doc] Add JSDoc comments to all public interfaces and methods
- [ ] T030 [Doc] Create README.md in `packages/storage` with usage examples
- [ ] T031 [Doc] Create README.md in `packages/storage-azure` with configuration guide

## Phase 6: Integration Preparation

- [ ] T032 [Integration] Create example bootstrap code showing how to initialize storage
- [ ] T033 [Integration] Document environment variables required for Azure
- [ ] T034 [Integration] Create example API route handler using storage abstraction

## Dependencies

- **Phase 1** must complete before Phase 2 and Phase 3
- **Phase 2** must complete before Phase 3 (Azure implementation depends on abstraction)
- **Phase 3** must complete before Phase 4 (testing)
- **Phase 4** can run in parallel with Phase 5 (documentation)

## Implementation Strategy

The implementation will follow a bottom-up approach:
1. First, create the abstraction package with interfaces and in-memory implementation
2. Then, implement the Azure package using the abstraction
3. Finally, add comprehensive tests and documentation

This ensures the abstraction is well-defined before concrete implementations are built.


