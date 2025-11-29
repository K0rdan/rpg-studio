# Feature Specification: RPG Player Core

**Feature Branch**: `002-rpg-player-core`
**Created**: 2025-11-29
**Status**: Draft
**Input**: User description: "A lightweight web player to run games created with the RPG Editor"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Game Loading (Priority: P1)

As a player, I want to load a game project so that I can play the game.

**Why this priority**: This is the entry point for the player application.

**Independent Test**: The player can load a `game.json` configuration and initial map data from a specified source (e.g., local file or URL).

**Acceptance Scenarios**:

1. **Given** I open the player application, **When** I provide a valid game project source, **Then** the game initializes and loads the starting map.
2. **Given** I try to load an invalid or corrupted game source, **When** the player attempts to load, **Then** an error message is displayed.

---

### User Story 2 - Map Rendering (Priority: P1)

As a player, I want to see the game map rendered on the screen so that I can navigate the world.

**Why this priority**: Visualizing the game world is essential for gameplay.

**Independent Test**: The player renders the map grid and tiles correctly based on the loaded map data using the Canvas 2D API.

**Acceptance Scenarios**:

1. **Given** a game is loaded, **When** the starting map is displayed, **Then** the tiles match the layout defined in the editor.
2. **Given** the map has multiple layers, **When** it renders, **Then** the layers are drawn in the correct order (e.g., background first, then foreground).

---

### User Story 3 - Character Rendering & Movement (Priority: P2)

As a player, I want to see my character and move them around the map.

**Why this priority**: Interaction and exploration are core RPG mechanics.

**Independent Test**: The player character is rendered at the starting position and moves in response to keyboard input.

**Acceptance Scenarios**:

1. **Given** the game is running, **When** I press the arrow keys (or WASD), **Then** the character sprite moves in the corresponding direction.
2. **Given** the character moves, **When** they reach the edge of the screen or a collision object (future scope), **Then** movement is restricted appropriately (basic bounds checking for now).

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST be able to parse `GameProject`, `Map`, and `Character` data structures defined in `packages/types`.
- **FR-002**: The player MUST use the HTML5 Canvas 2D API for all rendering.
- **FR-003**: The player MUST run in a standard web browser (Chrome, Firefox, Safari, Edge).
- **FR-004**: The system MUST support loading game data from a JSON source.
- **FR-005**: The system MUST render tile-based maps with support for multiple layers.
- **FR-006**: The system MUST render character sprites on top of the map.
- **FR-007**: The system MUST handle keyboard input for character movement.
- **FR-008**: The player application MUST be built using Vite.

### Key Entities _(include if feature involves data)_

- **GameEngine**: The core class responsible for the game loop, rendering, and state management.
- **Scene**: Represents the current active state (e.g., a specific map).
- **Renderer**: Handles the drawing of maps and entities to the canvas.
- **InputManager**: Captures and processes user input.

## Constitutional Alignment _(mandatory)_

_This section ensures the feature's requirements align with the project's core principles._

- **Principle I: Respect for Types**: The player MUST strictly adhere to the data structures defined in `packages/types`.
- **Principle II: Separation of Concerns**: The player logic will reside in `apps/player` and `packages/core`. `packages/core` should contain the pure game engine logic (loop, rendering, input) and be framework-agnostic. `apps/player` will be the Vite wrapper.
- **Principle III: Lightweight Player**: The player MUST remain minimal, loading only necessary assets and logic. It should not depend on heavy frameworks like React (except for the outer shell if needed, but the engine itself is pure TS).
- **Principle IV: Prioritize Native Canvas**: All rendering MUST be done via `CanvasRenderingContext2D`. No external rendering libraries (Pixi, Phaser) are allowed.
- **Principle V: Test-Driven Development (TDD)**: Core engine logic (math, physics, state) should be unit tested.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The player can load and render a 100x100 map in under 1 second.
- **SC-002**: The game loop maintains a steady 60 FPS on standard hardware.
- **SC-003**: Input latency (time from key press to character movement) is under 50ms.

## End-to-End Testing Strategy _(mandatory)_

### Tooling
- **Framework**: Cypress (or Playwright if preferred for Vite, but Cypress is already in use).
- **Scope**: Critical gameplay flows.

### Functional Flows

#### 1. Game Start
- **Goal**: Verify the game loads correctly.
- **Steps**:
    1. Launch the player with a test project.
    2. Verify the canvas is present.
    3. Verify the map tiles are rendered.

#### 2. Player Movement
- **Goal**: Verify character movement.
- **Steps**:
    1. Load the game.
    2. Simulate key press (Right Arrow).
    3. Verify the character's position has updated on the canvas (visual regression or state check).
