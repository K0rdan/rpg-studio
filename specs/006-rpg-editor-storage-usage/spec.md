# Feature Specification: RPG Editor Storage Usage

**Feature Branch**: `006-rpg-editor-storage-usage`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "We will now work on the feature '006-rpg-editor-storage-usage' to implement the work made on the @packages/storage to be used on the editor and make the user able to push into the storage the tilesets."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Upload Tileset Image (Priority: P1)

As a game developer, I want to upload a tileset image file to cloud storage so that I can use custom tilesets in my projects.

**Why this priority**: This is the core functionality - without the ability to upload tilesets, the storage integration is incomplete.

**Independent Test**: A user can select a tileset image file, provide metadata (name, tile dimensions), and upload it to Azure Storage. The tileset is then available for use in maps within the project.

**Acceptance Scenarios**:

1. **Given** I am on a project's tileset management page, **When** I click "Upload Tileset" and select a valid image file (PNG, JPEG, WebP), **Then** I am prompted to enter tileset name, tile width, and tile height.
2. **Given** I have entered valid tileset metadata and selected an image file, **When** I confirm the upload, **Then** the image is uploaded to Azure Storage, tileset metadata is saved to the database, and I see a success message.
3. **Given** I attempt to upload a file with an unsupported format, **When** I try to upload, **Then** I see an error message indicating the format is not supported.
4. **Given** I attempt to upload a file that exceeds the size limit (10MB), **When** I try to upload, **Then** I see an error message indicating the file is too large.

---

### User Story 2 - View Project Tilesets (Priority: P1)

As a game developer, I want to see all tilesets available in my project so that I can select them when creating maps.

**Why this priority**: Users need to see and manage their uploaded tilesets. This is essential for the workflow.

**Independent Test**: A user can view a list of all tilesets in their project, including name, tile dimensions, and a thumbnail preview.

**Acceptance Scenarios**:

1. **Given** I have uploaded one or more tilesets to my project, **When** I navigate to the tilesets page, **Then** I see a list of all tilesets with their names, tile dimensions, and thumbnail images.
2. **Given** I have not uploaded any tilesets, **When** I navigate to the tilesets page, **Then** I see an empty state with a message and an option to upload a tileset.
3. **Given** I am viewing the tilesets list, **When** I click on a tileset, **Then** I can see more details or edit the tileset.

---

### User Story 3 - Use Tileset in Map Editor (Priority: P1)

As a game designer, I want to select a project tileset when creating or editing a map so that I can use my custom tilesets.

**Why this priority**: The uploaded tilesets must be usable in the map editor. This completes the workflow from upload to usage.

**Independent Test**: A user can select a project tileset in the map editor, and the tileset image loads correctly from Azure Storage.

**Acceptance Scenarios**:

1. **Given** I have uploaded a tileset to my project, **When** I create or edit a map and select that tileset from the dropdown, **Then** the tileset image loads and displays correctly in the tile palette.
2. **Given** I am editing a map with a project tileset, **When** I save the map, **Then** the map correctly references the tileset ID and the tileset image remains accessible.
3. **Given** I am viewing a map that uses a project tileset, **When** I open the map editor, **Then** the tileset image loads from Azure Storage and displays correctly.

---

### User Story 4 - Delete Tileset (Priority: P2)

As a game developer, I want to delete a tileset from my project so that I can manage my assets and free up storage space.

**Why this priority**: Asset management is important, but lower priority than core upload/view/use functionality.

**Independent Test**: A user can delete a tileset, and both the database record and Azure Storage assets are removed.

**Acceptance Scenarios**:

1. **Given** I have uploaded a tileset, **When** I delete it from the tilesets list, **Then** I am prompted to confirm deletion, and after confirmation, the tileset is removed from the database and Azure Storage.
2. **Given** I attempt to delete a tileset that is used by one or more maps, **When** I try to delete it, **Then** I see a warning message indicating which maps use this tileset, and I can choose to proceed or cancel.
3. **Given** I have deleted a tileset, **When** I view maps that previously used it, **Then** the maps still exist but show an error or placeholder for the missing tileset.

---

### Edge Cases

- What happens if Azure Storage is unavailable during upload?
- How does the system handle concurrent uploads of the same tileset?
- What happens if a tileset image is deleted from Azure Storage but the database record remains?
- How are tilesets handled when a project is deleted?
- What is the maximum number of tilesets per project?
- How does the system handle very large tileset images (e.g., 4K resolution)?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST allow users to upload tileset images (PNG, JPEG, WebP) up to 10MB in size.
- **FR-002**: The system MUST require users to provide tileset name, tile width, and tile height when uploading.
- **FR-003**: The system MUST validate image file format and size before upload.
- **FR-004**: The system MUST store tileset metadata in MongoDB with a reference to the project.
- **FR-005**: The system MUST upload tileset images to Azure Storage using the `@packages/storage` abstraction.
- **FR-006**: The system MUST store the storage location identifier in the tileset metadata.
- **FR-007**: The system MUST provide an API endpoint to list all tilesets for a project.
- **FR-008**: The system MUST provide an API endpoint to create a new tileset (with image upload).
- **FR-009**: The system MUST provide an API endpoint to delete a tileset (removing both DB record and storage assets).
- **FR-010**: The system MUST provide an API endpoint to get a tileset by ID.
- **FR-011**: The system MUST generate and return accessible URLs for tileset images when requested.
- **FR-012**: The system MUST allow maps to reference project tilesets by ID.
- **FR-013**: The system MUST display tileset thumbnails in the tilesets list.
- **FR-014**: The system MUST prevent deletion of tilesets that are in use by maps (or warn the user).
- **FR-015**: The system MUST handle errors gracefully and provide meaningful error messages to users.
- **FR-016**: The system MUST validate that the user owns the project before allowing tileset upload or deletion.
- **FR-017**: The system MUST use a separate storage path for each user (`users/{userId}/projects/...`) to ensure data isolation.

### Non-Functional Requirements

- **NFR-001**: Tileset uploads MUST complete in under 30 seconds for files up to 10MB.
- **NFR-002**: Tileset image URLs MUST be accessible for at least 24 hours (SAS token expiry).
- **NFR-003**: The system MUST support at least 100 tilesets per project.
- **NFR-004**: Tileset metadata queries MUST complete in under 500ms.
- **NFR-005**: The upload API MUST validate file size before processing to prevent memory issues.
- **NFR-006**: The system MUST use Azure Entra ID (Service Principal) for secure storage access, avoiding long-lived account keys where possible.
- **NFR-007**: The system MUST use User Delegation SAS tokens signed by the Service Principal for generating client-accessible URLs.

### Key Entities _(include if feature involves data)_

- **User**: New entity representing the system user.
  - `id`: string
  - `name`: string
  - `email`: string

- **Tileset** (enhanced): Existing type from `@packages/types` with additional fields:
  - `id`: string (MongoDB ObjectId as hex string)
  - `name`: string
  - `image_source`: string (URL from Azure Storage)
  - `tile_width`: number
  - `tile_height`: number
  - `projectId`: string (reference to project)
  - `storageLocation`: string (storage key from `TilesetAssetLocation`)
  - `createdAt`: Date (optional, for sorting/filtering)
  - `updatedAt`: Date (optional, for tracking changes)

- **GameProject** (enhanced): 
  - `tilesets: string[]`: Array of tileset IDs (similar to maps and characters).
  - `userId: string`: ID of the User who owns the project (Foreign Key).

## Constitutional Alignment _(mandatory)_

_This section ensures the feature's requirements align with the project's core principles._

- **Principle I: Respect for Types**: Yes, the `Tileset` type from `@packages/types` will be used. We may extend it with project-specific fields, but the core structure remains.
- **Principle II: Separation of Concerns**: Storage operations use the `@packages/storage` abstraction. API routes handle HTTP and database operations. UI components handle user interaction. No Azure-specific code in UI.
- **Principle III: Lightweight Player**: The player will receive tileset URLs from the API (same as before). No changes to player code.
- **Principle IV: Prioritize Native Canvas**: Tileset images from Azure Storage work identically to local images with the Canvas API. No changes to rendering logic.
- **Principle V: Test-Driven Development (TDD)**: All API endpoints and storage operations will have comprehensive tests. In-memory storage can be used for testing.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can upload a tileset image (up to 10MB) and see it in the tilesets list within 30 seconds.
- **SC-002**: A user can select a project tileset in the map editor and the image loads correctly.
- **SC-003**: All tileset operations (upload, list, delete) handle errors gracefully with user-friendly messages.
- **SC-004**: The system correctly cleans up Azure Storage assets when a tileset is deleted.
- **SC-005**: Tileset URLs remain accessible for at least 24 hours after generation.

## End-to-End Testing Strategy _(mandatory)_

### Tooling
- **Framework**: Cypress for E2E, Jest for unit/integration tests
- **Scope**: Full tileset lifecycle (upload → view → use → delete)

### Functional Flows

#### 1. Tileset Upload and Usage Flow
- **Goal**: Verify that a user can upload a tileset and use it in a map.
- **Steps**:
    1. Navigate to project tilesets page.
    2. Click "Upload Tileset" and select an image file.
    3. Enter tileset name, tile width, and tile height.
    4. Confirm upload and verify success message.
    5. Verify tileset appears in the list with thumbnail.
    6. Navigate to map editor.
    7. Select the uploaded tileset from the tileset dropdown.
    8. Verify tileset image loads in the tile palette.
    9. Paint a tile on the map.
    10. Save the map and verify it persists.

#### 2. Tileset Deletion Flow
- **Goal**: Verify that tileset deletion works correctly and prevents deletion of in-use tilesets.
- **Steps**:
    1. Upload a tileset.
    2. Create a map using that tileset.
    3. Attempt to delete the tileset.
    4. Verify warning message about maps using the tileset.
    5. Cancel deletion and verify tileset still exists.
    6. Delete the map.
    7. Delete the tileset.
    8. Verify tileset is removed from database and storage.

#### 3. Error Handling Flow
- **Goal**: Verify that errors are handled gracefully.
- **Steps**:
    1. Attempt to upload an unsupported file format.
    2. Verify error message is displayed.
    3. Attempt to upload a file exceeding 10MB.
    4. Verify error message is displayed.
    5. Attempt to access a deleted tileset in a map.
    6. Verify appropriate error/placeholder is shown.


