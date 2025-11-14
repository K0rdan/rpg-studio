# Tasks: RPG Editor Project Management

**Branch**: `001-rpg-editor-project-management` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This document breaks down the implementation of the RPG Editor Project Management feature into actionable tasks, organized by user story.

## Phase 1: Setup

- [ ] T001 Initialize Next.js application in `apps/editor`
- [ ] T002 Configure MongoDB connection in `apps/editor`
- [ ] T003 Set up Jest for testing in `apps/editor`

## Phase 2: Foundational Tasks

- [ ] T004 [P] Define `GameProject` data structure in `packages/types/src/project.ts`
- [ ] T005 [P] Define `Map` and `Layer` data structures in `packages/types/src/map.ts`
- [ ] T006 [P] Define `Character` data structure in `packages/types/src/character.ts`
- [ ] T007 [P] Define `Tileset` and `Tile` data structures in `packages/types/src/tileset.ts`

## Phase 3: User Story 1 - Project Creation

**Goal**: As a game developer, I want to create a new game project so that I can start building my game.
**Independent Test**: A user can create a new project, which results in a new project folder with a default configuration file. The project is then visible in a project selection list.

- [ ] T008 [US1] Create failing test for project creation API endpoint in `apps/editor/src/app/api/projects/projects.test.ts`
- [ ] T009 [US1] Implement API endpoint for creating a new project in `apps/editor/src/app/api/projects/route.ts`
- [ ] T010 [US1] Create failing test for project list API endpoint in `apps/editor/src/app/api/projects/projects.test.ts`
- [ ] T011 [US1] Implement API endpoint for listing all projects in `apps/editor/src/app/api/projects/route.ts`
- [ ] T012 [US1] Create "New Project" button and modal in `apps/editor/src/components/NewProject.tsx`
- [ ] T013 [US1] Implement project creation form and logic in `apps/editor/src/components/NewProject.tsx`
- [ ] T014 [US1] Create project list component in `apps/editor/src/components/ProjectList.tsx`
- [ ] T015 [US1] Implement logic to fetch and display project list in `apps/editor/src/app/page.tsx`

## Phase 4: User Story 2 - Basic Map Editing

**Goal**: As a game designer, I want to create and edit a game map by placing tiles onto a grid.
**Independent Test**: A user can create a new map, select a tileset, and paint tiles onto the map canvas. The changes are saved to the project's map data.

- [ ] T016 [US2] Create failing test for map creation API endpoint in `apps/editor/src/app/api/projects/[projectId]/maps/maps.test.ts`
- [ ] T017 [US2] Implement API endpoint for creating a new map in `apps/editor/src/app/api/projects/[projectId]/maps/route.ts`
- [ ] T018 [US2] Create "New Map" button and modal in `apps/editor/src/components/NewMap.tsx`
- [ ] T019 [US2] Implement map creation form and logic in `apps/editor/src/components/NewMap.tsx`
- [ ] T020 [US2] Create map editor component in `apps/editor/src/components/MapEditor.tsx`
- [ ] T021 [US2] Implement canvas-based map rendering in `apps/editor/src/components/MapEditor.tsx`
- [ ] T022 [US2] Implement tile palette component in `apps/editor/src/components/TilePalette.tsx`
- [ ] T023 [US2] Implement tile painting logic in `apps/editor/src/components/MapEditor.tsx`

## Phase 5: User Story 3 - Character Design

**Goal**: As a game designer, I want to create and edit game characters (e.g., player, NPCs) with their attributes and associated sprites.
**Independent Test**: A user can create a new character, define its name, stats, and assign a sprite. The character data is saved to the project.

- [ ] T024 [US3] Create failing test for character creation API endpoint in `apps/editor/src/app/api/projects/[projectId]/characters/characters.test.ts`
- [ ] T025 [US3] Implement API endpoint for creating a new character in `apps/editor/src/app/api/projects/[projectId]/characters/route.ts`
- [ ] T026 [US3] Create "New Character" button and modal in `apps/editor/src/components/NewCharacter.tsx`
- [ ] T027 [US3] Implement character creation form and logic in `apps/editor/src/components/NewCharacter.tsx`
- [ ] T028 [US3] Create character editor component in `apps/editor/src/components/CharacterEditor.tsx`
- [ ] T029 [US3] Implement character list component in `apps/editor/src/components/CharacterList.tsx`

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T030 Refine UI/UX for all new components
- [ ] T031 Add comprehensive error handling and user feedback
- [ ] T032 Write end-to-end tests for the main user flows

## Dependencies

- **User Story 1** is a prerequisite for all other user stories.
- **User Story 2** and **User Story 3** can be implemented in parallel after User Story 1 is complete.

## Parallel Execution

- **Phase 2**: All tasks (T004-T007) can be executed in parallel.
- **Phase 3 (US1)**: T008/T009 can be parallel with T010/T011. UI tasks (T012-T015) can start once the APIs are defined.
- **Phase 4 (US2)** and **Phase 5 (US3)** can be worked on in parallel.

## Implementation Strategy

The implementation will follow an MVP-first approach. The initial focus will be on completing User Story 1 to provide the core project creation functionality. Subsequent user stories will be implemented incrementally, allowing for continuous feedback and integration.
