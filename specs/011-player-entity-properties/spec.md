# Feature Specification: Player Entity Gameplay Properties

**Feature Branch**: `011-player-entity-properties`  
**Created**: 2026-03-02  
**Status**: Draft  
**Input**: "The Player Entity should have dedicated properties: Health, Speed, etc. We should identify the core properties and make them editable in the editor and used in the game engine. The player's speed is important because right now a small press on an arrow key makes the player move from half the map width."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Configure Player Speed (Priority: P1) 🎮

As a game designer, I want to set the player's movement speed in the editor so that the player moves at a pace appropriate for my game, not the hardcoded default.

**Why this priority**: The current hardcoded speed causes the player to teleport across half the map on a brief keypress — the game is unplayable.

**Independent Test**:
1. Open a project with a map and a Player entity.
2. In the Entity Properties panel, find the "Speed" field and set it to `4`.
3. Launch the preview.
4. Press and briefly hold an arrow key.
5. **Expected**: the player moves a few tiles smoothly, not half the map.

**Acceptance Scenarios**:
1. **Given** a Player entity with `speed: 4`, **When** I hold an arrow key for 1 second, **Then** the player moves approximately 4 tiles.
2. **Given** a Player entity with `speed: 8`, **When** I hold an arrow key for 1 second, **Then** the player moves approximately 8 tiles (twice as fast).
3. **Given** a Player entity with `speed: 2`, **When** I hold an arrow key for 1 second, **Then** the player moves approximately 2 tiles (half speed).

---

### User Story 2 — View Player Health in Editor (Priority: P2)

As a game designer, I want to set the player's starting health so I can design encounters balanced to the player's HP pool.

**Acceptance Scenarios**:
1. **Given** a Player entity, **When** I open Entity Properties, **Then** I see `Health` and `Max Health` numeric fields.
2. **Given** I set `Max Health: 50`, **When** the engine initializes, **Then** the player starts with 50 HP.

---

### User Story 3 — Trigger Field Hidden for Player (Priority: P2)

As a game designer, I don't want to see irrelevant "Trigger" and "Commands" fields on the Player entity because they only apply to NPCs/interactables.

**Acceptance Scenarios**:
1. **Given** the Player entity is selected, **When** Entity Properties opens, **Then** no "Trigger" dropdown or "Commands" section is displayed.
2. **Given** an NPC entity is selected, **When** Entity Properties opens, **Then** Trigger and Commands are displayed as normal.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `packages/types` MUST define a `PlayerProperties` interface with `speed`, `health`, `maxHealth`.
- **FR-002**: `Entity.trigger` MUST become optional (it is meaningless for the player entity).
- **FR-003**: `PlayerController` MUST read `speed` from `entity.playerProperties.speed` (data-driven, not hardcoded).
- **FR-004**: `PlayerController` speed MUST use **tiles/second** semantics with correct `deltaTime` (ms) calculation.
- **FR-005**: Editor's `EntityProperties` panel MUST show a dedicated "Player Properties" section when `entity.type === 'player'`, displaying Speed, Health, Max Health as numeric inputs.
- **FR-006**: Editor's `EntityProperties` panel MUST hide the Trigger dropdown and Commands section when `entity.type === 'player'`.
- **FR-007**: The player entity template default MUST include `playerProperties` with sensible defaults.
- **FR-008**: Changes to `playerProperties` in the editor MUST persist via the existing entity API (no new endpoints needed).

### Non-Functional Requirements

- **NFR-001**: No breaking change to existing NPC/interactable/door entity data.
- **NFR-002**: Speed of 4 tiles/second MUST produce visually smooth movement at 60fps.

---

## Success Criteria *(mandatory)*

- **SC-001**: Player moves at a consistent, smooth speed controlled by the `speed` property.
- **SC-002**: `speed`, `health`, and `maxHealth` are editable in the Entity Properties panel for player entities.
- **SC-003**: Trigger and Commands are hidden for player entities in the editor.
- **SC-004**: Default player speed is `4 tiles/second` (configurable).
- **SC-005**: `packages/types` build succeeds with no breaking type errors.
