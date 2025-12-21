# Tasks: RPG Editor Storage Usage

**Branch**: `006-rpg-editor-storage-usage` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This document breaks down the implementation of the Storage Usage feature into actionable tasks.

## Phase 1: Setup & Storage Integration

- [x] T001 Create `apps/editor/src/lib/storage.ts` with storage bootstrap function
- [x] T002 Install `@packages/storage` dependency in `apps/editor/package.json`
- [x] T003 Configure environment variables documentation for Azure Storage
- [x] T004 Create storage initialization helper that uses `parseAzureStorageConfigFromEnv()`
- [x] T004a Install `@azure/identity` in `@packages/storage`
- [x] T004b Configure Service Principal authentication in `@packages/storage`
- [x] T004c Implement User Delegation SAS generation

## Phase 2: Data Model Updates

- [x] T005 [P] Update `GameProject` type in `packages/types/src/project.ts` to include `tilesets: string[]`
- [x] T005a [P] Update `GameProject` type to include `userId: string`
- [x] T005b [P] Create `User` type in `packages/types/src/user.ts` (id, name, email)
- [ ] T006 [P] Create MongoDB schema/documentation for tilesets collection
- [ ] T007 [P] Define extended Tileset type for database (with projectId, storageLocation, timestamps)

## Phase 3: API Routes - Tileset CRUD

- [ ] T008 [US1] Create failing test for tileset upload API endpoint
- [x] T009 [US1] Implement `POST /api/projects/[projectId]/tilesets/upload` endpoint
  - [x] T009a Handle multipart/form-data file upload (Updated to `POST /api/projects/[projectId]/tilesets`)
  - [x] T009b Validate file format (MIME type)
  - [x] T009c Validate file size (≤ 10MB)
  - [x] T009d Validate tile dimensions (positive integers)
  - [x] T009e Upload to Azure Storage using `@packages/storage` (using `users/{userId}/...` path)
  - [x] T009f Save tileset metadata to MongoDB
  - [x] T009g Generate and return image URL
  - [x] T009h Update project's tilesets array
  - [x] T009i Validate project ownership (userId match)
- [ ] T010 [US2] Create failing test for tileset list API endpoint
- [ ] T011 [US2] Implement `GET /api/projects/[projectId]/tilesets` endpoint
  - [ ] T011a Query MongoDB for project tilesets
  - [ ] T011b Generate image URLs for each tileset
  - [ ] T011c Return formatted tileset list
- [ ] T012 [US2] Create failing test for tileset get by ID endpoint
- [ ] T013 [US2] Implement `GET /api/projects/[projectId]/tilesets/[tilesetId]` endpoint
  - [ ] T013a Query MongoDB for tileset by ID
  - [ ] T013b Verify tileset belongs to project
  - [ ] T013c Generate and return image URL
- [ ] T014 [US4] Create failing test for tileset delete endpoint
- [ ] T015 [US4] Implement `DELETE /api/projects/[projectId]/tilesets/[tilesetId]` endpoint
  - [ ] T015a Check if tileset is used by any maps
  - [ ] T015b Delete from Azure Storage using `@packages/storage`
  - [ ] T015c Delete from MongoDB
  - [ ] T015d Remove from project's tilesets array
  - [ ] T015e Return appropriate error if tileset is in use
  - [ ] T015f Validate project ownership before deletion

## Phase 4: UI Components - Tileset Management

- [ ] T016 [US1] Create `TilesetUpload.tsx` component
  - [ ] T016a File input for image selection
  - [ ] T016b Form fields: name, tile_width, tile_height
  - [ ] T016c File validation (format, size) with error messages
  - [ ] T016d Upload button with loading state
  - [ ] T016e Success/error toast notifications
- [ ] T017 [US2] Create `TilesetCard.tsx` component
  - [ ] T017a Display tileset thumbnail
  - [ ] T017b Display tileset name and dimensions
  - [ ] T017c Delete button with confirmation
  - [ ] T017d Loading state for thumbnail
- [ ] T018 [US2] Create `TilesetList.tsx` component
  - [ ] T018a Fetch and display tilesets list
  - [ ] T018b Empty state when no tilesets
  - [ ] T018c Grid/list layout with tileset cards
  - [ ] T018d Integration with TilesetUpload component
- [ ] T019 [US2] Add tilesets section to project dashboard/page
  - [ ] T019a Add navigation/link to tilesets page
  - [ ] T019b Create tilesets page route
  - [ ] T019c Integrate TilesetList component

## Phase 5: Map Editor Integration

- [ ] T020 [US3] Update `GET /api/tilesets` to include project tilesets
  - [ ] T020a Merge project tilesets with static tilesets (or separate endpoint)
  - [ ] T020b Return unified tileset list
- [ ] T021 [US3] Update `MapProperties.tsx` to fetch project tilesets
  - [ ] T021a Fetch tilesets from project-specific endpoint
  - [ ] T021b Update tileset dropdown to show project tilesets
  - [ ] T021c Handle loading and error states
- [ ] T022 [US3] Verify tileset images load correctly in MapEditor
  - [ ] T022a Test with Azure Storage URLs
  - [ ] T022b Verify tile palette displays correctly
  - [ ] T022c Verify map rendering works with project tilesets

## Phase 6: Error Handling & Validation

- [ ] T023 [Error] Implement comprehensive error handling in API routes
  - [ ] T023a Handle storage errors (NetworkError, UploadFailedError, etc.)
  - [ ] T023b Handle database errors
  - [ ] T023c Return appropriate HTTP status codes
  - [ ] T023d Return user-friendly error messages
- [ ] T024 [Error] Add client-side validation for file uploads
  - [ ] T024a Validate file type before upload
  - [ ] T024b Validate file size before upload
  - [ ] T024c Show validation errors in UI
- [ ] T025 [US4] Implement tileset usage checking before deletion
  - [ ] T025a Query maps collection for tileset usage
  - [ ] T025b Return warning with map names if in use
  - [ ] T025c Allow forced deletion (future enhancement)

## Phase 7: Testing

- [ ] T026 [Test] Write unit tests for storage bootstrap
- [ ] T027 [Test] Write unit tests for API routes (with mocked storage)
- [ ] T028 [Test] Write integration tests for full upload flow (with in-memory storage)
- [ ] T029 [Test] Write integration tests for tileset CRUD operations
- [ ] T030 [Test] Write E2E tests for tileset upload and usage flow
- [ ] T031 [Test] Write E2E tests for tileset deletion flow
- [ ] T032 [Test] Write tests for error handling scenarios

## Phase 8: Documentation & Polish

- [ ] T033 [Doc] Update API documentation with new tileset endpoints
- [ ] T034 [Doc] Create user guide for tileset upload
- [ ] T035 [Doc] Document environment variables for Azure Storage
- [ ] T036 [Polish] Add loading states to all async operations
- [ ] T037 [Polish] Improve error messages and user feedback
- [ ] T038 [Polish] Add tileset thumbnail optimization (if needed)

## Dependencies

- **Phase 1** must complete before Phase 2 and Phase 3
- **Phase 2** must complete before Phase 3 (data model needed for API)
- **Phase 3** must complete before Phase 4 (API needed for UI)
- **Phase 4** can run in parallel with Phase 5
- **Phase 6** should be integrated throughout Phases 3-5
- **Phase 7** should run continuously alongside development

## Implementation Strategy

The implementation will follow an incremental approach:
1. First, set up storage integration and data model
2. Then, implement API endpoints with comprehensive error handling
3. Next, build UI components for tileset management
4. Finally, integrate with map editor and add polish

This allows for early testing of storage integration and API endpoints before UI work begins.


