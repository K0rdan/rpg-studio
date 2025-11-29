# Tasks: RPG Player Core

**Branch**: `002-rpg-player-core` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This document breaks down the implementation of the RPG Player Core into actionable tasks.

## Phase 1: Setup

- [ ] T001 Initialize Vite application in `apps/player`
- [ ] T002 Configure `packages/core` for TypeScript development (tsconfig, package.json)
- [ ] T003 Set up Vitest for unit testing in `packages/core`
- [ ] T004 Link `packages/core` and `packages/types` to `apps/player`

## Phase 2: Core Engine (packages/core)

**Goal**: Build the framework-agnostic game engine.

- [ ] T005 Create `GameLoop` class (start, stop, tick)
- [ ] T006 Create `Renderer` class (clear, drawImage, drawRect) wrapping Canvas API
- [ ] T007 Create `InputManager` class (listen to key events)
- [ ] T008 Implement `Scene` management (load map, update, render)
- [ ] T009 Implement `MapRenderer` (iterate layers and tiles)
- [ ] T010 Implement `SpriteRenderer` (draw character sprites)

## Phase 3: Player Runtime (apps/player)

**Goal**: Create the web shell to run the engine.

- [ ] T011 Create main entry point to initialize the engine on a canvas
- [ ] T012 Implement logic to fetch/load `game.json` and map data
- [ ] T013 Integrate `InputManager` with browser events

## Phase 4: Integration & Features

- [ ] T014 Connect Engine to Player: Render a static map
- [ ] T015 Implement Character movement logic (update position based on input)
- [ ] T016 Implement basic collision detection (map bounds)

## Phase 5: Testing & Polish

- [ ] T017 Write unit tests for `GameLoop` and `InputManager`
- [ ] T018 Write E2E test for game loading and rendering
- [ ] T019 Optimize rendering loop (requestAnimationFrame)
