# RPG Studio

## Project Overview

This project is a 2D game editor, similar to widely used game engines on the market. It is a monorepo using Turborepo.

The main components are:
- An editor to create games (Next.js)
- A player to run games (Vite)
- A documentation website (Docusaurus)
- A pure game engine (Canvas 2D, Vanilla TS)
- Shared TypeScript definitions
- Shared React components
- Shared TS configs and linting rules

## Repository structure

The project is a monorepo using Turborepo. The file structure is as follows:

```
/rpg-studio
├── turbo.json
├── package.json
├── apps/
│ ├── editor/ # (Next.js) The application for creating games
│ ├── player/ # (Vite) The runtime application for running games
│ └── docs/ # (Docusaurus) Documentation
└── packages/
├── core/ # The pure game engine (Canvas 2D, Vanilla TS)
├── types/ # Shared TypeScript definitions (VERY IMPORTANT)
├── ui/ # Shared React components (for the editor)
├── tsconfig/ # Shared TS configs
└── eslint-config/ # Linting rules
```

## Technical stack

### Applications

- **Editor (`apps/editor`)**: Next.js (App Router) + TypeScript + React
- **Player (`apps/player`)**: Vite.
- **Documentation (`apps/docs`)**: Docusaurus.

### Packages

- **Engine (`packages/core`)**: Pure TypeScript, no framework, using the native Canvas 2D API.
- **Types (`packages/types`)**: Pure TypeScript.

## Folder roles

- **`apps/editor` (The Tool)**: This is the interface (React) used to manipulate the data (JSON) that will conform to `packages/types`. It uses `packages/core` for previewing.
- **`packages/core` (The Engine)**: Pure game logic. Agnostic of React or Next.js. It takes the structures from `packages/types` and draws them on a `<canvas>`. It manages the game loop, collisions, or inputs.
- **`packages/types` (The Source of Truth)**: This is the contract. The editor produces JSON compliant with these types. The engine (core and player) reads these types. Any change to the game logic starts with thinking about these types.

## Golden rules

- **Respect for types**: Any new game logic or editor feature must first be modeled in `packages/types`.
- **Separation of concerns**: NEVER put React or Next.js code in `packages/core`. The core must remain agnostic.
- **Lightweight player**: `apps/player` must remain minimalist. It loads `packages/core` and the game data (`game.json`), that's all.
- **Prioritize Native Canvas**: For `packages/core`, do NOT use external engines (Phaser, Pixi) unless explicitly requested. The logic must be based on `CanvasRenderingContext2D`.

## Building and Running

### Editor (`apps/editor`)

*   **Development**: `npm run dev`
*   **Build**: `npm run build`
*   **Start**: `npm run start`
*   **Lint**: `npm run lint`

### Player (`apps/player`)

*   **Development**: `npm run dev`
*   **Build**: `npm run build`
*   **Preview**: `npm run preview`

### Documentation (`apps/docs`)

*   **Development**: `npm run start`
*   **Build**: `npm run build`
*   **Serve**: `npm run serve`
*   **Test**: `npm run typecheck`

### Packages

*   **core**:
    *   `npm run build`: Compiles the package.
    *   `npm run dev`: Watches for changes and recompiles.
    *   `npm run test`: (Not yet implemented)
*   **types**:
    *   `npm run build`: Compiles the package.
    *   `npm run dev`: Watches for changes and recompiles.
    *   `npm run test`: (Not yet implemented)
*   **ui**:
    *   `npm run build`: Compiles the package.
    *   `npm run dev`: Watches for changes and recompiles.
    *   `npm run test`: (Not yet implemented)
*   **eslint-config**: Configuration package, no build required.
*   **tsconfig**: Configuration package, no build required.

## Active Technologies
- TypeScrip + Next.js, React, Turborepo, MongoDB (001-rpg-editor-project-management)
- MongoDB Atlas (001-rpg-editor-project-management)

## Recent Changes
- 001-rpg-editor-project-management: Added TypeScrip + Next.js, React, Turborepo, MongoDB
