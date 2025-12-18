# Feature Specification: Storage Abstraction Package

**Feature Branch**: `005-package-storage`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "I've provisioned an Azure infrastructure for hosting those Tilesets on an Account Storage. Could you please define a strategy with some analysis and establish the specs to handle the abstraction of access to infrastructure."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Tileset Image Upload (Priority: P1)

As a game developer, I want to upload tileset images to cloud storage so that they are accessible from anywhere and can be shared across projects.

**Why this priority**: This is the foundation for moving from local file storage to cloud-based asset management. Without this, tilesets remain tied to local file paths.

**Independent Test**: A developer can upload a tileset image file, receive a storage location identifier, and retrieve a URL to access that image.

**Acceptance Scenarios**:

1. **Given** I have a tileset image file, **When** I call the storage upload method with project ID, tileset ID, and image data, **Then** the image is stored in Azure Storage and I receive a storage location identifier.
2. **Given** I have uploaded a tileset image, **When** I request a URL for that image using its storage location, **Then** I receive a valid URL that can be used to display the image.
3. **Given** I upload an image with an unsupported MIME type, **When** I attempt to upload, **Then** I receive an error indicating the format is not supported.

---

### User Story 2 - Tileset Image Retrieval (Priority: P1)

As a game developer, I want to retrieve tileset images from cloud storage using a simple, consistent API regardless of the underlying storage provider.

**Why this priority**: The abstraction must work seamlessly for both reading and writing. This ensures the editor and player can load tilesets without knowing about Azure.

**Independent Test**: A developer can retrieve a tileset image URL using only a storage location identifier, without needing to know about Azure containers or blob names.

**Acceptance Scenarios**:

1. **Given** I have a storage location identifier for a tileset image, **When** I request the image URL, **Then** I receive a URL that can be used in an `<img>` tag or canvas.
2. **Given** I request a URL for a non-existent storage location, **When** I attempt to retrieve it, **Then** I receive an appropriate error.
3. **Given** I am using private storage with SAS tokens, **When** I request a URL, **Then** I receive a time-limited signed URL that expires after a configurable duration.

---

### User Story 3 - Tileset Asset Deletion (Priority: P2)

As a game developer, I want to delete tileset assets from storage when a tileset is removed from a project.

**Why this priority**: Prevents storage bloat and ensures cleanup when tilesets are deleted. Lower priority than upload/retrieval but important for data management.

**Independent Test**: A developer can delete all assets associated with a tileset, and subsequent requests for those assets return appropriate errors.

**Acceptance Scenarios**:

1. **Given** I have uploaded tileset assets, **When** I delete the tileset using its project ID and tileset ID, **Then** all associated assets are removed from storage.
2. **Given** I attempt to delete a non-existent tileset, **When** I call the delete method, **Then** the operation completes without error (idempotent).
3. **Given** I delete a tileset, **When** I attempt to retrieve its URL afterward, **Then** I receive an error indicating the asset does not exist.

---

### Edge Cases

- What happens if Azure Storage is temporarily unavailable? (Network errors, service outages)
- How does the system handle concurrent uploads of the same tileset?
- What is the maximum file size for tileset images?
- How are storage location identifiers structured? Are they opaque or human-readable?
- What happens if a SAS token expires while a user is viewing a tileset?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide an abstract interface for tileset image storage that does not expose Azure-specific details.
- **FR-002**: The system MUST support uploading tileset images with metadata (project ID, tileset ID, MIME type).
- **FR-003**: The system MUST generate storage location identifiers that are opaque to consumers.
- **FR-004**: The system MUST provide a method to retrieve URLs for tileset images using storage location identifiers.
- **FR-005**: The system MUST support deletion of tileset assets by project ID and tileset ID.
- **FR-006**: The system MUST validate MIME types before accepting uploads (e.g., image/png, image/jpeg).
- **FR-007**: The system MUST handle errors gracefully and provide meaningful error messages.
- **FR-008**: The system MUST support both public and private storage access patterns (with SAS tokens).
- **FR-009**: The Azure implementation MUST be configurable via environment variables.
- **FR-010**: The abstraction MUST allow for alternative implementations (e.g., in-memory for testing, local filesystem for development).

### Non-Functional Requirements

- **NFR-001**: The storage abstraction MUST have zero Azure SDK dependencies in the interface package.
- **NFR-002**: The Azure implementation MUST use the official `@azure/storage-blob` SDK.
- **NFR-003**: URL generation MUST complete in under 100ms for cached configurations.
- **NFR-004**: Upload operations MUST support files up to 10MB (configurable).
- **NFR-005**: The abstraction MUST be testable with an in-memory implementation.

### Key Entities _(include if feature involves data)_

- **TilesetAssetLocation**: Opaque identifier representing where a tileset image is stored. Contains a `storageKey` that is implementation-specific.
- **TilesetStorage**: Interface defining operations for tileset asset storage (upload, get URL, delete).
- **AzureTilesetStorage**: Concrete implementation using Azure Blob Storage.
- **InMemoryTilesetStorage**: Test implementation that stores assets in memory.

## Constitutional Alignment _(mandatory)_

_This section ensures the feature's requirements align with the project's core principles._

- **Principle I: Respect for Types**: Yes, new types (`TilesetAssetLocation`, storage interfaces) will be defined in `packages/storage`. The existing `Tileset` type in `packages/types` will continue to use `image_source: string` (which can now be a storage URL).
- **Principle II: Separation of Concerns**: The storage abstraction (`packages/storage`) contains only interfaces and types. The Azure implementation (`packages/storage-azure`) contains all Azure-specific code. The editor (`apps/editor`) uses the abstraction without knowing about Azure.
- **Principle III: Lightweight Player**: The player will continue to receive tileset URLs from the editor/API. No storage logic is added to the player.
- **Principle IV: Prioritize Native Canvas**: The storage abstraction does not affect canvas rendering. URLs returned by storage can be used directly with `Image` objects and canvas.
- **Principle V: Test-Driven Development (TDD)**: The abstraction enables easy testing with in-memory implementations. All implementations should have comprehensive tests.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A developer can upload a tileset image and retrieve its URL in under 2 seconds (including network latency).
- **SC-002**: The storage abstraction can be swapped between Azure and in-memory implementations without changing consuming code.
- **SC-003**: All storage operations handle errors gracefully with typed error classes.
- **SC-004**: The Azure implementation correctly generates SAS URLs with configurable expiry times.
- **SC-005**: The in-memory implementation enables 100% test coverage of storage-dependent code without Azure dependencies.

## End-to-End Testing Strategy _(mandatory)_

### Tooling
- **Framework**: Jest (unit tests), optional integration tests with Azure Storage Emulator
- **Scope**: Storage abstraction interfaces, Azure implementation, in-memory implementation

### Functional Flows

#### 1. Upload and Retrieve Flow
- **Goal**: Verify that tileset images can be uploaded and retrieved successfully.
- **Steps**:
    1. Create a storage instance (Azure or in-memory).
    2. Upload a test tileset image with project ID and tileset ID.
    3. Verify the storage location is returned.
    4. Retrieve the URL for the uploaded image.
    5. Verify the URL is valid and can be used to load the image.

#### 2. Error Handling Flow
- **Goal**: Verify that errors are handled gracefully.
- **Steps**:
    1. Attempt to upload an invalid MIME type.
    2. Verify an appropriate error is thrown.
    3. Attempt to retrieve a URL for a non-existent storage location.
    4. Verify an appropriate error is thrown.

#### 3. Deletion Flow
- **Goal**: Verify that tileset assets can be deleted.
- **Steps**:
    1. Upload a tileset image.
    2. Delete the tileset assets.
    3. Attempt to retrieve the URL.
    4. Verify an error is returned indicating the asset does not exist.


