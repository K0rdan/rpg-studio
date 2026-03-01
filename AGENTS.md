# AGENTS.md — RPG Studio

> This file is the primary entry point for all AI agents working on this repository.
> Read it entirely before taking any action.

---

## 1. Project Overview

RPG Studio is a 2D game editor monorepo (Turborepo). It allows users to create and run 2D games through a set of specialized apps and shared packages.

**Key principle**: `packages/types` is the source of truth. Every feature starts there.

---

## 2. Repository Structure

```
/rpg-studio
├── turbo.json
├── package.json
├── apps/
│   ├── editor/       # Next.js (App Router) — game creation interface
│   ├── player/       # Vite — runtime for playing games
│   └── docs/         # Docusaurus — documentation site
└── packages/
    ├── core/         # Pure game engine (Canvas 2D, Vanilla TS) — NO React
    ├── types/        # Shared TypeScript definitions — SOURCE OF TRUTH
    ├── ui/           # Shared React components (editor only)
    ├── tsconfig/     # Shared TS configs
    └── eslint-config/ # Shared linting rules
```

---

## 3. Technical Stack

| Scope | Technology |
|---|---|
| Editor (`apps/editor`) | Next.js (App Router), React, TypeScript, MUI |
| Player (`apps/player`) | Vite, TypeScript |
| Docs (`apps/docs`) | Docusaurus |
| Engine (`packages/core`) | Vanilla TypeScript, Canvas 2D API |
| Types (`packages/types`) | Pure TypeScript |
| Auth | Better-Auth — GitHub, Google, Microsoft, Email |
| Storage | Azure Storage with Service Principal |
| Database | MongoDB Atlas |
| Monorepo | Turborepo |

---

## 4. Agent Workflows (Spec-Driven Development)

This project uses Spec-Driven Development via Spec Kit.
All workflow commands and conventions are defined in:

```
.agent/workflows/
```

Before implementing any feature, consult the relevant workflow files in that directory.
The standard development sequence is: **constitution → specify → clarify → plan → tasks → implement**.

---

## 5. Golden Rules — Must Follow

### Architecture
- **Types first**: Any new game logic or editor feature MUST be modeled in `packages/types` before any implementation.
- **Core agnosticism**: NEVER put React, Next.js, or any UI framework code in `packages/core`. It must remain framework-agnostic.
- **Player minimalism**: `apps/player` must stay minimal — it only loads `packages/core` and `game.json`. Do not add unnecessary dependencies.
- **Native Canvas**: In `packages/core`, do NOT use external engines (Phaser, PixiJS, etc.) unless explicitly instructed. Use `CanvasRenderingContext2D` only.

### Data
- **MongoDB IDs**: Always use `string` for IDs in application code. Only convert to `ObjectId` when querying the `_id` field directly. See `specs/DESIGN_MONGODB_OBJECTID_PATTERN.md` for details.

### Code Quality
- All code must be written in **TypeScript** with strict typing.
- Shared types belong in `packages/types`, never duplicated across apps.
- Follow existing ESLint rules defined in `packages/eslint-config`.

---

## 6. What Agents Must NOT Do

- Do NOT modify `packages/types` without understanding the downstream impact on `packages/core`, `apps/editor`, and `apps/player`.
- Do NOT install external game engines in `packages/core`.
- Do NOT add business logic in `apps/player`.
- Do NOT bypass TypeScript strict mode or use `any` without explicit justification.
- Do NOT create new shared components outside `packages/ui`.

---

## 7. Testing Standards

### Unit & Integration — Jest
- Used for logic in `packages/core` and `packages/types`.
- Test files colocated with source: `*.test.ts` or `*.spec.ts`.
- Run tests: `npm run test` from the relevant package.

### End-to-End — Cypress
- Used for `apps/editor` user flows.
- Tests located in `apps/editor/cypress/`.
- Run E2E tests: `npm run cypress` from `apps/editor`.

### Guidelines
- Every new feature in `packages/core` must include unit tests.
- Critical editor user flows must have a corresponding Cypress test.
- Do not ship features with failing tests.

---

## 8. Build & Dev Commands

### Apps

| App | Dev | Build | Notes |
|---|---|---|---|
| `apps/editor` | `npm run dev` | `npm run build` | Next.js, `npm run start` to serve |
| `apps/player` | `npm run dev` | `npm run build` | Vite, `npm run preview` to serve |
| `apps/docs` | `npm run start` | `npm run build` | Docusaurus, `npm run typecheck` for tests |

### Packages

| Package | Dev | Build |
|---|---|---|
| `packages/core` | `npm run dev` | `npm run build` |
| `packages/types` | `npm run dev` | `npm run build` |
| `packages/ui` | `npm run dev` | `npm run build` |
| `packages/eslint-config` | — | not required |
| `packages/tsconfig` | — | not required |

### Monorepo (from root)
```bash
npm run dev      # Start all apps in parallel
npm run build    # Build all packages and apps
npm run lint     # Lint entire monorepo
```

---

## 9. Decision Hierarchy

When uncertain, apply this order of priority:

1. Check `packages/types` — does the data structure already exist?
2. Check `packages/core` — does the game logic already exist?
3. Check `.agent/workflows/` — is there a workflow that applies?
4. Check `specs/` — is there a design decision document?
5. Then implement.