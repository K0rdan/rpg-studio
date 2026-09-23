<!--
Sync Impact Report:
Version change: 1.0.0 -> 1.1.0 (Minor: added AI graphic asset generation principles VI–XI)
Modified principles: None (I–V retained with original titles and meaning)
Added sections:
  - Core Principles VI–XI (AI graphic asset generation module)
Removed sections: None
Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Original adoption date unknown
  - Resolver note: `.specify/scripts/bash/resolve-template.sh` failed
    (`resolve_template_content` is not defined in common.sh). This file
    was composed from `.specify/templates/constitution-template.md` and
    the existing project constitution. No `.specify/extensions.yml` and
    no additional template layers were present in-repo.
-->
# RPG Studio Constitution

## Core Principles

### I. Respect for Types
Any new game logic or editor feature MUST first be modeled in
`packages/types`. This package is the single source of truth for data
structures and contracts.

### II. Separation of Concerns
NEVER put React or Next.js code in `packages/core`. The core engine MUST
remain framework-agnostic, focusing solely on pure game logic.

### III. Lightweight Player
`apps/player` MUST remain minimalist. Its sole responsibility is to load
`packages/core` and game data (`game.json`).

### IV. Prioritize Native Canvas
For `packages/core`, external game engines (e.g., Phaser, Pixi) MUST NOT
be used unless explicitly requested. The logic MUST be based on
`CanvasRenderingContext2D`.

### V. Test-Driven Development (TDD)
All new features and bug fixes MUST follow a Test-Driven Development
approach. Tests MUST be written before implementation, approved by the
team, and pass after implementation.

### VI. Native Generation Orchestration
The graphic asset generation workflow (anchoring, family sequencing,
transitions, post-processing) MUST be implemented natively in the
editor backend. External no-code orchestrators (Make, n8n, Zapier, or
equivalents) MUST NOT implement generation business logic. Those tools
MAY be used only for ancillary notification or synchronization, never
for the core generation pipeline.

Rationale: generation sequencing, reference reuse, and post-processing
are product rules. Outsourcing them to an external workflow tool makes
the pipeline untestable, non-reproducible, and outside the editor's
ownership boundary.

### VII. Visual Consistency via Image-to-Image Anchoring
After the first tile family in a generation chain, every subsequent
family generation MUST pass at least one reference image (from a
previously validated generation) into the model in addition to text.
Style consistency MUST NOT rely solely on repeating a textual style
description in the prompt.

Rationale: text-only style prompts do not lock pixel language (palette,
outline weight, lighting). Image-to-image anchoring is the enforceable
mechanism for visual continuity across families.

### VIII. Strict Generation Responsibility Split
The generation system MUST be composed of four independently testable
bricks. These bricks MUST remain interchangeable at their boundaries
and MUST NOT leak responsibilities into one another:

- **ProjectStyleSpec**: fixed project parameters (tile size, perspective,
  palette, lighting)
- **GenerationClient**: the single abstraction over model APIs (Claude,
  GPT, Gemini); swapping a provider MUST NOT require changes outside
  this brick
- **PromptBuilder**: deterministic prompt construction; the end user
  MUST NOT submit a free-form prompt directly into the generation
  pipeline
- **PostProcessor**: local pixel processing (crop, grid snap, palette
  quantization); this brick MUST always run and MUST NOT be delegated
  to the generative model

### IX. Non-Negotiable Post-Processing
No image produced by a generative model MAY be stored or shown to the
user as a usable tile until it has passed through the PostProcessor
(exact crop to tile dimensions plus grid snap). Palette quantization
SHOULD run in the same pass; it MAY be deferred to a later iteration
if not yet implemented, but crop and grid snap MUST NOT be skipped.

### X. Reference Traceability
Each generated tile family MUST be associated in project state
(`AssetGraph`) with the reference image(s) used for its generation.
This graph MUST make it possible to regenerate a family from its
dependency and to identify downstream impact (especially transitions)
when a family is regenerated.

### XI. Independently Testable Generation Stages
Each workflow stage (base generation, family generation, transition
generation) MUST be deliverable and verifiable independently of later
stages. A stage MUST NOT require a complete implementation of
subsequent stages in order to ship or to be tested.

## Technical Stack Adherence

Editor (`apps/editor`): Next.js 16 (App Router) + TypeScript + React 19 + MUI + Zustand.
Player (`apps/player`): Vite + `@packages/core` only.
Documentation (`apps/docs`): Docusaurus.
Engine (`packages/core`): Pure TypeScript, no framework, native Canvas 2D API.
Types (`packages/types`): Pure TypeScript — source of truth.
Storage (`packages/storage`): Azure Blob / Azurite / in-memory.
Auth: Better Auth (editor API routes).
Database: MongoDB; application IDs are strings (ObjectId only for `_id` queries).

Project-wide planning details: `.specify/memory/technical-context.md`.

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
PRs that add or change graphic asset generation MUST verify principles VI–XI
(native orchestration, image-to-image anchoring, brick boundaries,
post-processing, AssetGraph traceability, and independently testable stages).

**Version**: 1.1.0 | **Ratified**: TODO(RATIFICATION_DATE): Original adoption date unknown | **Last Amended**: 2026-09-17
