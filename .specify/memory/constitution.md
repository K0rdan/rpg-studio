<!--
Sync Impact Report:
Version change: 1.0.0 -> 1.0.0 (Major: Initial constitution and templates setup)
Modified principles:
  - PRINCIPLE_1_NAME: Respect for Types
  - PRINCIPLE_2_NAME: Separation of Concerns
  - PRINCIPLE_3_NAME: Lightweight Player
  - PRINCIPLE_4_NAME: Prioritize Native Canvas
  - PRINCIPLE_5_NAME: Test-Driven Development (TDD)
Added sections:
  - Technical Stack Adherence
  - Code Quality & Review
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ updated
  - .specify/templates/spec-template.md: ✅ updated
  - .specify/templates/tasks-template.md: ✅ updated
  - .gemini/commands/speckit.analyze.toml: ✅ updated
  - .gemini/commands/speckit.checklist.toml: ✅ updated
  - .gemini/commands/speckit.clarify.toml: ✅ updated
  - .gemini/commands/speckit.constitution.toml: ✅ updated
  - .gemini/commands/speckit.implement.toml: ✅ updated
  - .gemini/commands/speckit.plan.toml: ✅ updated
  - .gemini/commands/speckit.specify.toml: ✅ updated
  - .gemini/commands/speckit.tasks.toml: ✅ updated
Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Original adoption date unknown
-->
# RPG Studio Constitution

## Core Principles

### I. Respect for Types
Any new game logic or editor feature MUST first be modeled in `packages/types`. This package is the single source of truth for data structures and contracts.

### II. Separation of Concerns
NEVER put React or Next.js code in `packages/core`. The core engine MUST remain framework-agnostic, focusing solely on pure game logic.

### III. Lightweight Player
`apps/player` MUST remain minimalist. Its sole responsibility is to load `packages/core` and game data (`game.json`).

### IV. Prioritize Native Canvas
For `packages/core`, external game engines (e.g., Phaser, Pixi) MUST NOT be used unless explicitly requested. The logic MUST be based on `CanvasRenderingContext2D`.

### V. Test-Driven Development (TDD)
All new features and bug fixes MUST follow a Test-Driven Development approach. Tests MUST be written before implementation, approved by the team, and pass after implementation.

## Technical Stack Adherence

Editor (`apps/editor`): Next.js (App Router) + TypeScript + React
Player (`apps/player`): Vite
Documentation (`apps/docs`): Docusaurus
Engine (`packages/core`): Pure TypeScript, no framework, using the native Canvas 2D API.
Types (`packages/types`): Pure TypeScript.

## Code Quality & Review

All code changes MUST be submitted via Pull Requests (PRs).
PRs MUST be reviewed and approved by at least one other team member before merging.
All automated tests (unit, integration) MUST pass before a PR can be merged.
Linting and type-checking MUST pass as part of the CI/CD pipeline.

## Governance

This Constitution supersedes all other project practices and guidelines.
Amendments to this Constitution MUST be proposed via a PR, reviewed, and approved by the core team.
All PRs and code reviews MUST verify compliance with the principles outlined herein.
Complexity in design or implementation MUST be justified and documented.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): Original adoption date unknown | **Last Amended**: 2025-11-13