# Implementation Plan: RPG Editor Storage Usage

**Branch**: `006-rpg-editor-storage-usage` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)

## Summary

This plan outlines the integration of the `@packages/storage` package into the RPG Editor, enabling users to upload tileset images to Azure Storage and manage project-scoped tilesets. The implementation will add tileset CRUD operations, integrate storage uploads, and update the UI to support tileset management.

## Technical Context

**Language/Version**: TypeScript  
**Primary Dependencies**: 
- Next.js (API routes, file upload handling)
- `@packages/storage` (storage abstraction)
- MongoDB (tileset metadata)
- Material-UI (UI components)
**Storage**: Azure Blob Storage (via `@packages/storage`)  
**Testing**: Jest (unit/integration), Cypress (E2E)  
**Target Platform**: Web Browser (editor)  
**Project Type**: Next.js application within monorepo  
**Performance Goals**: 
- Upload completion in under 30 seconds for 10MB files
- Tileset list queries in under 500ms
- Image URLs accessible for 24+ hours
**Constraints**: 
- Must use `@packages/storage` abstraction (no direct Azure SDK in editor)
- Must maintain backward compatibility with existing static tilesets (during migration)
- File size limit: 10MB per tileset image
**Scale/Scope**: Initial scope focuses on tileset upload/management. Future expansion may include other asset types (sprites, music, etc.).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Respect for Types**: **Pass**. Uses existing `Tileset` type from `@packages/types`. May extend with project-specific fields stored in MongoDB.
- **Principle II: Separation of Concerns**: **Pass**. Storage operations use `@packages/storage` abstraction. API routes handle HTTP/database. UI handles user interaction.
- **Principle III: Lightweight Player**: **Pass**. Player receives tileset URLs from API (no changes to player code).
- **Principle IV: Prioritize Native Canvas**: **Pass**. Azure Storage URLs work identically to local URLs with Canvas API.
- **Principle V: Test-Driven Development (TDD)**: **Pass**. Comprehensive tests using in-memory storage for unit tests, Azure for integration tests.

## Project Structure

### Documentation (this feature)

```text
specs/006-rpg-editor-storage-usage/
├── plan.md              # This file
├── spec.md              # Feature specification
├── tasks.md             # Implementation tasks
└── contracts/           # API contracts
    └── openapi.yaml     # OpenAPI specification for tileset endpoints
```

### Source Code (repository root)

```text
apps/editor/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── projects/
│   │           └── [projectId]/
│   │               └── tilesets/
│   │                   ├── route.ts          # GET, POST (list, create)
│   │                   ├── [tilesetId]/
│   │                   │   ├── route.ts      # GET, DELETE (get, delete)
│   │                   │   └── upload/
│   │                   │       └── route.ts  # POST (handle file upload)
│   │                   └── tilesets.test.ts   # API tests
│   ├── components/
│   │   ├── TilesetList.tsx        # NEW: List of project tilesets
│   │   ├── TilesetUpload.tsx      # NEW: Upload form component
│   │   └── TilesetCard.tsx        # NEW: Tileset display card
│   └── lib/
│       └── storage.ts             # NEW: Storage initialization/bootstrap
```

**Structure Decision**: Tilesets are project-scoped, so API routes are nested under `/api/projects/[projectId]/tilesets`. This follows the existing pattern for maps and characters. File uploads are handled via multipart/form-data in a dedicated upload endpoint.

## Architecture Design

### Layer 1: Storage Bootstrap (`apps/editor/src/lib/storage.ts`)

**Purpose**: Initialize and configure the storage abstraction.

**Contents**:
- `getTilesetStorage()`: Factory function that returns configured `AzureTilesetStorage` instance
- Uses `parseAzureStorageConfigFromEnv()` from `@packages/storage`
- Handles environment variable configuration
- Can be swapped for `InMemoryTilesetStorage` in test environment

**Dependencies**: `@packages/storage`

### Layer 2: API Routes (`apps/editor/src/app/api/projects/[projectId]/tilesets/`)

**Purpose**: Handle HTTP requests for tileset operations.

**Endpoints**:
- `GET /api/projects/[projectId]/tilesets`: List all tilesets for a project
- `POST /api/projects/[projectId]/tilesets`: Create tileset metadata (after upload)
- `GET /api/projects/[projectId]/tilesets/[tilesetId]`: Get tileset by ID
- `DELETE /api/projects/[projectId]/tilesets/[tilesetId]`: Delete tileset
- `POST /api/projects/[projectId]/tilesets/upload`: Handle file upload and storage

**File Upload Flow**:
1. Client sends multipart/form-data with image file and metadata
2. API validates file (format, size)
3. API uploads to Azure Storage via `@packages/storage`
4. API saves tileset metadata to MongoDB with storage location
5. API returns tileset object with image URL

**Dependencies**: 
- `@packages/storage` (storage operations)
- MongoDB (metadata storage)
- Next.js `NextRequest` (file handling)

### Layer 3: UI Components (`apps/editor/src/components/`)

**Purpose**: User interface for tileset management.

**Components**:
- `TilesetList.tsx`: Displays list of project tilesets with thumbnails
- `TilesetUpload.tsx`: Form for uploading new tilesets (file picker, name, dimensions)
- `TilesetCard.tsx`: Individual tileset card with thumbnail, name, dimensions, delete button

**Integration Points**:
- Tileset selection in `MapProperties.tsx` (update to show project tilesets)
- Project dashboard (add tilesets section)
- Map editor (tileset dropdown already exists, just needs to fetch project tilesets)

**Dependencies**: Material-UI, React

### Data Model Updates

**MongoDB Collections**:
- `tilesets`: New collection
  ```typescript
  {
    _id: ObjectId,
    projectId: string,        // Reference to project
    name: string,
    tile_width: number,
    tile_height: number,
    storageLocation: string,  // storageKey from TilesetAssetLocation
    image_source: string,    // URL (generated on read)
    createdAt: Date,
    updatedAt: Date
  }
  ```

**GameProject Updates**:
- Add `tilesets: string[]` array to track tileset IDs (similar to `maps` and `characters`)

## File Upload Strategy

### Approach: Multipart Form Data

**Rationale**: Next.js has built-in support for multipart/form-data via `req.formData()`. This is simpler than streaming uploads for files up to 10MB.

**Flow**:
1. Client creates `FormData` with:
   - `file`: Image file (Blob/File)
   - `name`: Tileset name (string)
   - `tile_width`: Tile width (number)
   - `tile_height`: Tile height (number)
2. API receives via `req.formData()`
3. API validates file (type, size)
4. API converts file to Buffer
5. API uploads to storage
6. API saves metadata to MongoDB
7. API returns tileset with image URL

### File Validation

**Before Upload**:
- Check MIME type (must be `image/png`, `image/jpeg`, `image/webp`)
- Check file size (must be ≤ 10MB)
- Validate tile dimensions (must be positive integers)

**Error Handling**:
- Return 400 with specific error message for validation failures
- Return 500 for storage/database errors

## URL Generation Strategy

**On Read**: When fetching tilesets, generate fresh URLs using `getTilesetImageUrl()`.

**Caching**: URLs are generated on-demand. SAS tokens have 24-hour expiry, so URLs remain valid for a full day.

**Storage**: Store only `storageLocation` (storage key) in database. Generate URLs when serving tilesets to clients.

## Migration Strategy

**Backward Compatibility**: 
- Existing static tilesets (from `config/tilesets.ts`) remain available
- API can return both project tilesets and static tilesets
- Map editor can use either type

**Future Migration**:
- Optionally migrate static tilesets to project-scoped storage
- Or keep static tilesets as "default" tilesets available to all projects

## Error Handling

**Storage Errors**:
- Wrap Azure SDK errors in `@packages/storage` error types
- Return appropriate HTTP status codes (400, 404, 500)
- Include user-friendly error messages

**Validation Errors**:
- Return 400 with specific field errors
- Use consistent error response format

**Database Errors**:
- Handle MongoDB errors gracefully
- Return 500 for unexpected database errors

## Testing Strategy

### Unit Tests

- **Storage Bootstrap**: Test initialization with environment variables
- **API Routes**: Mock storage and database, test request/response handling
- **File Validation**: Test MIME type and size validation

### Integration Tests

- **Full Upload Flow**: Test with in-memory storage (no Azure dependency)
- **Database Operations**: Test MongoDB interactions
- **Error Scenarios**: Test error handling paths

### E2E Tests (Cypress)

- **Upload Flow**: Upload tileset, verify it appears in list
- **Usage Flow**: Upload tileset, use in map editor
- **Delete Flow**: Delete tileset, verify cleanup

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |


