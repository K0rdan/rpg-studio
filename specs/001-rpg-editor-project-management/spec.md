# Feature Specification: RPG Editor Project Management

**Feature Branch**: `001-rpg-editor-project-management`  
**Created**: 2025-11-13
**Status**: Draft  
**Input**: User description: "RPG 2D Editor where we can create Game Projects and design all the content of the game"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Project Creation (Priority: P1)

As a game developer, I want to create a new game project so that I can start building my games.

**Why this priority**: This is the entry point for any game development activity. Without a project, no other feature is usable.

**Independent Test**: A user can create a new project, which results in a new project folder with a default configuration file. The project is then visible in a project selection list.

**Acceptance Scenarios**:

1. **Given** I am on the editor's welcome screen, **When** I click the "New Project" button, **Then** I am prompted to enter a project name and select a location.
2. **Given** I have entered a valid project name and location, **When** I confirm the creation, **Then** a new project is created with a default structure and I am taken to the project's main dashboard.
3. **Given** I try to create a project in a location that already contains a project, **When** I confirm the creation, **Then** I see an error message and the project is not created.

---

### User Story 2 - Basic Map Editing (Priority: P2)

As a game designer, I want to create and edit a game map by placing tiles onto a grid.

**Why this priority**: Maps are a fundamental part of most 2D RPGs. This provides the core creative tool for building the game world.

**Independent Test**: A user can create a new map, select a tileset, select a layer and paint tiles onto the map canvas. The changes are saved to the project's map data.

**Acceptance Scenarios**:

1. **Given** I have a project open, **When** I create a new map, **Then** a new empty map view is displayed with a grid.
2. **Given** I have a map open, **When** I select a tile from a tileset palette, **Then** I can place that tile onto the current layer of the map grid by clicking.
3. **Given** I have placed tiles on the map, **When** I save the project, **Then** the map data is updated and my changes are visible when I reopen the map.

---

### User Story 3 - Character Design (Priority: P3)

As a game designer, I want to create and edit game characters (e.g., player, NPCs) with their attributes and associated sprites.

**Why this priority**: Characters are a core element of RPGs, enabling the creation of protagonists and non-player characters is fundamental.

**Independent Test**: A user can create a new character, define its name, role (player or npc), stats, and assign a sprite. The character data is saved to the project.

**Acceptance Scenarios**:

1. **Given** I have a project open, **When** I navigate to the Character Editor, **Then** I can see a list of existing characters a button to edit their attributes and an option to create a new one.
2. **Given** I am in the Character Editor, **When** I create a new character and define its name, attributes (e.g., HP, Attack), and assign a sprite, **Then** the character is saved and appears in the character list.
3. **Given** I have an existing character, **When** I modify its attributes or sprite, **Then** the changes are saved to the character data.

---

### Edge Cases

- What happens if the user tries to create a project with an invalid name (e.g., containing special characters)?
- How does the system handle missing or corrupted project files on load?
- What happens if the user tries to import an asset with an unsupported format?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST allow users to create a new, named game project at a specified file system location.
- **FR-002**: Each new project MUST be initialized with a default configuration file (e.g., `game.json`).
- **FR-003**: The editor MUST display a list of existing projects that the user can open.
- **FR-004**: Users MUST be able to create a new map within a project, specifying its dimensions (width and height).
- **FR-005**: The editor MUST provide a tile palette from which users can select tiles.
- **FR-006**: Users MUST be able to "paint" selected tiles onto the map grid.
- **FR-007**: The system MUST save the project data, including map layouts and other content.
- **FR-008**: The system MUST allow users to create, edit, and manage game characters, including their names, attributes (e.g., health, attack), and associated visual sprites.
- **FR-009**: The system MUST display newly created entities (projects, maps, characters) immediately in their respective lists without requiring a manual page refresh.
- **FR-010**: The system MUST allow users to delete an existing project.
- **FR-011**: The system MUST allow users to delete an existing map from a project.
- **FR-012**: The system MUST allow users to delete an existing character from a project.

### Key Entities _(include if feature involves data)_

- **GameProject**: Represents the entire game. Contains all maps, assets, and configurations. Attributes: `name`, `root_path`, `config`.
- **Map**: A 2D grid representing a single game area. Attributes: `name`, `width`, `height`, `layers`.
- **Tileset**: A collection of tiles that can be used to build maps. Attributes: `name`, `image_source`, `tile_width`, `tile_height`.
- **Tile**: A single graphical element within a Tileset. Attributes: `id`, `position_in_tileset`.
- **Character**: A game entity with defined attributes and a visual representation. Attributes: `name`, `hp`, `attack`, `defense`, `sprite_id`.

## Constitutional Alignment _(mandatory)_

_This section ensures the feature's requirements align with the project's core principles._

- **Principle I: Respect for Types**: Yes, new data structures like `GameProject`, `Map`, and `Tileset` will be introduced. Their definitions MUST be created in `packages/types`.
- **Principle II: Separation of Concerns**: The editor UI will be in `apps/editor` (React/Next.js). The core logic for handling project structure and map data manipulation should be agnostic and potentially part of `packages/core` if it's not editor-specific. No React code will be in `packages/core`.
- **Principle III: Lightweight Player**: This feature primarily concerns the editor. The player will be affected by loading the `game.json` produced by the editor, but this feature should not add any libraries or significant logic to the player itself.
- **Principle IV: Prioritize Native Canvas**: The map editor will use a `<canvas>` to render the map grid and tiles. This aligns with using the native Canvas 2D API.
- **Principle V: Test-Driven Development (TDD)**: The user stories and acceptance criteria are defined to be testable, which supports a TDD approach.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new user can create a project and a basic 10x10 map with at least one tile placed in under 5 minutes.
- **SC-002**: The editor can load a project with over 10 maps, each 100x100, in under 3 seconds.
- **SC-003**: The core map painting interaction (selecting and placing a tile) should feel instantaneous (under 100ms).
- **SC-004**: 95% of first-time users can successfully create and save a new project without consulting documentation.

## End-to-End Testing Strategy _(mandatory)_

### Tooling
- **Framework**: Cypress
- **Scope**: Critical user flows that span multiple pages or components.

### Functional Flows

#### 1. Project Lifecycle
- **Goal**: Verify that a user can manage the full lifecycle of a project.
- **Steps**:
    1. Create a new project with a unique name.
    2. Verify the project appears in the project list.
    3. Open the project and verify the dashboard loads.
    4. Delete the project.
    5. Verify the project is removed from the list.

#### 2. Map Management
- **Goal**: Verify that a user can create, edit, and delete maps.
- **Steps**:
    1. Open an existing project.
    2. Create a new map with specific dimensions.
    3. Select a tile from the palette and paint it on the canvas.
    4. Save the map.
    5. Reload the page and verify the painted tile persists.
    6. Delete the map and verify it is removed from the list.

#### 3. Character Management
- **Goal**: Verify that a user can create, edit, and delete characters.
- **Steps**:
    1. Open an existing project.
    2. Create a new character with specific stats (HP, Attack, Defense).
    3. Verify the character appears in the list.
    4. Edit the character's stats and save.
    5. Reload and verify the new stats persist.
    6. Delete the character and verify it is removed from the list.
