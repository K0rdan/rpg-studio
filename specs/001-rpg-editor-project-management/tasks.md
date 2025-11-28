# Tasks: RPG Editor Project Management

**Branch**: `001-rpg-editor-project-management` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This document breaks down the implementation of the RPG Editor Project Management feature into actionable tasks, organized by user story.

## Phase 1: Setup

- [x] T001 Initialize Next.js application in `apps/editor`
- [x] T002 Configure MongoDB connection in `apps/editor`
- [x] T003 Set up Jest for testing in `apps/editor`
- [x] T004 Install Material UI dependencies (`@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/icons-material`)
- [x] T005 Setup MUI ThemeRegistry/Provider in `apps/editor`

## Phase 2: Foundational Tasks

- [x] T006 [P] Define `GameProject` data structure in `packages/types/src/project.ts`
- [x] T007 [P] Define `Map` and `Layer` data structures in `packages/types/src/map.ts`
- [x] T008 [P] Define `Character` data structure in `packages/types/src/character.ts`
- [x] T009 [P] Define `Tileset` and `Tile` data structures in `packages/types/src/tileset.ts`

## Phase 3: User Story 1 - Project Creation

**Goal**: As a game developer, I want to create a new game project so that I can start building my game.
**Independent Test**: A user can create a new project, which results in a new project folder with a default configuration file. The project is then visible in a project selection list.

- [x] T010 [US1] Create failing test for project creation API endpoint in `apps/editor/src/app/api/projects/projects.test.ts`
- [x] T011 [US1] Implement API endpoint for creating a new project in `apps/editor/src/app/api/projects/route.ts`
- [x] T012 [US1] Create failing test for project list API endpoint in `apps/editor/src/app/api/projects/projects.test.ts`
- [x] T013 [US1] Implement API endpoint for listing all projects in `apps/editor/src/app/api/projects/route.ts`
- [x] T014 [US1] Create "New Project" button and modal in `apps/editor/src/components/NewProject.tsx` (using MUI)
- [x] T015 [US1] Implement project creation form and logic in `apps/editor/src/components/NewProject.tsx`
- [x] T016 [US1] Create project list component in `apps/editor/src/components/ProjectList.tsx` (using MUI)
- [x] T017 [US1] Implement logic to fetch and display project list in `apps/editor/src/app/page.tsx`
- [x] T018 [Deletion] Implement API endpoint for deleting a project
- [x] T019 [Deletion] Add delete button to Project List

## Phase 4: User Story 2 - Basic Map Editing

**Goal**: As a game designer, I want to create and edit a game map by placing tiles onto a grid.
**Independent Test**: A user can create a new map, select a tileset, and paint tiles onto the map canvas. The changes are saved to the project's map data.

- [x] T020 [US2] Create failing test for map creation API endpoint in `apps/editor/src/app/api/projects/[projectId]/maps/maps.test.ts`
- [x] T021 [US2] Implement API endpoint for creating a new map in `apps/editor/src/app/api/projects/[projectId]/maps/route.ts`
- [x] T022 [US2] Create "New Map" button and modal in `apps/editor/src/components/NewMap.tsx` (using MUI)
- [x] T023 [US2] Implement map creation form and logic in `apps/editor/src/components/NewMap.tsx`
- [x] T024 [US2] Create map editor component in `apps/editor/src/components/MapEditor.tsx` (using MUI)
- [x] T025 [US2] Implement canvas-based map rendering in `apps/editor/src/components/MapEditor.tsx`
- [x] T026 [US2] Implement tile palette component in `apps/editor/src/components/TilePalette.tsx` (using MUI)
- [x] T027 [US2] Implement tile painting logic in `apps/editor/src/components/MapEditor.tsx`
- [x] T028 [Deletion] Implement API endpoint for deleting a map
- [x] T029 [Deletion] Add delete button to Map List

## Phase 5: User Story 3 - Character Design

**Goal**: As a game designer, I want to create and edit game characters (e.g., player, NPCs) with their attributes and associated sprites.
**Independent Test**: A user can create a new character, define its name, stats, and assign a sprite. The character data is saved to the project.

- [x] T030 [US3] Create failing test for character creation API endpoint in `apps/editor/src/app/api/projects/[projectId]/characters/characters.test.ts`
- [x] T031 [US3] Implement API endpoint for creating a new character in `apps/editor/src/app/api/projects/[projectId]/characters/route.ts`
- [x] T032 [US3] Create "New Character" button and modal in `apps/editor/src/components/NewCharacter.tsx` (using MUI)
- [x] T033 [US3] Implement character creation form and logic in `apps/editor/src/components/NewCharacter.tsx`
- [x] T034 [US3] Create character editor component in `apps/editor/src/components/CharacterEditor.tsx` (using MUI)
- [x] T035 [US3] Implement character list component in `apps/editor/src/components/CharacterList.tsx` (using MUI)
- [x] T036 [Deletion] Implement API endpoint for deleting a character
- [x] T037 [Deletion] Add delete button to Character List

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T038 Refine UI/UX for all new components (Integrated into MUI tasks)
- [x] T039 Add comprehensive error handling and user feedback
- [x] T040 Write end-to-end tests for the main user flows
- [x] T041 Verify all E2E tests pass with new UI

## Dependencies

- **User Story 1** is a prerequisite for all other user stories.
- **User Story 2** and **User Story 3** can be implemented in parallel after User Story 1 is complete.

## Implementation Strategy

The implementation will follow an MVP-first approach. The initial focus will be on completing User Story 1 to provide the core project creation functionality. Subsequent user stories will be implemented incrementally, allowing for continuous feedback and integration.
