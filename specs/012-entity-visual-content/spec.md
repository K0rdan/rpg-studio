# Feature Specification: Entity Visual Content — Charsets & Sprites

**Feature Branch**: `012-entity-visual-content`
**Created**: 2026-03-02
**Status**: Draft

---

## Context

Entities currently render as placeholder coloured squares (purple for NPCs, blue for player). This feature introduces a proper visual pipeline: upload a **charset image** (spritesheet), define animation frames, attach it to an entity, and see it rendered in the editor preview and game player.

**Scope**: Player charset + generic entity sprites. Tileset generation is out of scope (already implemented).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Attach a charset to the Player entity (P1) 🎮

As a game designer, I want to attach a charset image to my Player entity so that it renders as an animated character rather than a blue square.

**Acceptance Scenarios**:
1. **Given** an existing Player entity, **When** I open Entity Properties, **Then** I see a "Charset" section with an "Upload charset image" button.
2. **Given** I upload a 192×192 PNG (6 cols × 3 rows of 32×64 frames), **When** the upload completes, **Then** a preview of the charset thumbnail appears in Entity Properties.
3. **Given** a charset is attached, **When** I open the game preview, **Then** the player renders using the first frame of the `idle` animation instead of the blue box.
4. **Given** I hold an arrow key in the preview, **Then** the walk animation plays in the corresponding direction.

### User Story 2 — Asset Library for Sprites (P2)

As a game designer, I want a project-level Sprite Asset Library so I can reuse a sprite across multiple entities without re-uploading.

**Acceptance Scenarios**:
1. **Given** I am on a project, **When** I open the Asset Manager, **Then** I see a "Sprites" tab alongside Tilesets.
2. **Given** a sprite is in the library, **When** I edit an NPC entity, **Then** I can select that sprite from a dropdown in Entity Properties instead of uploading again.

### User Story 3 — NPC entity sprite (P2)

As a game designer, I want to attach a sprite to an NPC entity so it renders as a character and plays an idle animation.

**Acceptance Scenarios**:
1. **Given** an NPC entity, **When** I assign it a sprite from the library, **Then** the entity renders the sprite's `idle` animation on the canvas.

---

## Requirements *(mandatory)*

### Functional Requirements — Types

- **FR-001**: `packages/types` MUST define a `Charset` interface: spritesheet image URL, frame size, and a fixed set of RPG animation states (`idle`, `walk_up`, `walk_down`, `walk_left`, `walk_right`).
- **FR-002**: `Sprite` type must be extended (or a new `SpriteAsset` type added) to include `storageKey` for server-stored images and optional `projectId`.
- **FR-003**: `Entity.charsetId?: string` — optional reference to a Charset document.
- **FR-004**: `Entity.spriteId?: string` already exists; its semantics should be clarified (project-level sprite reference).

### Functional Requirements — Storage & API

- **FR-005**: Upload endpoint: `POST /api/projects/[projectId]/sprites` — accepts multipart form data, stores image in Azure Blob, creates sprite document in MongoDB.
- **FR-006**: List endpoint: `GET /api/projects/[projectId]/sprites` — returns all project sprites with pre-signed image URLs.
- **FR-007**: Delete endpoint: `DELETE /api/projects/[projectId]/sprites/[spriteId]`.
- **FR-008**: Attach endpoint: `PUT /api/projects/[projectId]/maps/[mapId]/entities/[entityId]` already exists — `spriteId` field is the link (no new endpoint needed).

### Functional Requirements — Editor UI

- **FR-009**: `EntityProperties` panel for Player: add a "Charset" card replacing/alongside the blue-box description; shows thumbnail + upload button.
- **FR-010**: `EntityProperties` panel for other entity types: show a "Sprite" dropdown populated from project sprite library + attach/unattach button.
- **FR-011**: Asset Manager must have a **Sprites** section for uploading and listing project sprites.

### Functional Requirements — Game Engine

- **FR-012**: `PlayerController` MUST render using `SpriteRenderer` when `entity.charsetId` is set and the charset image is loaded.
- **FR-013**: `PlayerController` movement MUST call `spriteRenderer.setAnimation()` based on movement direction (`walk_down`, `walk_up`, `walk_left`, `walk_right`) and `idle` when stationary.
- **FR-014**: `EntityRenderer` MUST load and render a `SpriteRenderer` when `entity.spriteId` resolves to a loaded sprite.
- **FR-015**: `GameEngine.init()` MUST pre-load all entity sprites/charsets before starting the loop.

### Non-Functional Requirements

- **NFR-001**: Spritesheet images ≤ 4MB. Validate server-side.
- **NFR-002**: Charset frame size defaults to 32×64 (1 tile wide, 2 tiles tall — standard RPG charset).
- **NFR-003**: Sprite asset storage follows the same Azure Blob / InMemory fallback pattern as tilesets.

---

## Success Criteria *(mandatory)*

- **SC-001**: Player entity renders charset animation instead of blue square in game preview.
- **SC-002**: Walk animations are triggered by arrow-key input per direction.
- **SC-003**: NPC entity with a sprite assigned renders it in preview.
- **SC-004**: Project sprite library lists uploaded sprites with thumbnails in the editor.
- **SC-005**: Sprites survive page refresh (persisted in MongoDB + Azure Blob).
