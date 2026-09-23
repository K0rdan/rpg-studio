# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  Copy the Plan fill-in block from `.specify/memory/technical-context.md`, then
  override only Storage, Constraints, Scale/Scope, and feature-specific
  Primary Dependencies. Stack fields are known — do not mark them
  NEEDS CLARIFICATION.
-->

**Language/Version**: TypeScript ~6, strict mode  
**Primary Dependencies**: Next.js 16 App Router, React 19, MUI 9, Zustand 5, MongoDB driver 7, Better Auth, `@packages/types`, `@packages/core`, `@packages/storage`; Canvas 2D in core; Vite 8 in player  
**Storage**: MongoDB (`projects`, `maps`, `tilesets`, `sprites`, `characters`); blob images via `@packages/storage`. IDs are `string` except `_id` queries → `ObjectId`. Feature: [collections/fields/blobs this feature touches, or N/A]  
**Testing**: Vitest (`packages/core`), Jest (`apps/editor`, `packages/storage`), Cypress (`apps/editor/cypress`)  
**Target Platform**: Modern desktop browsers (editor Next.js + player Vite/Canvas, including iframe preview)  
**Project Type**: Turborepo web monorepo (`apps/*`, `packages/*`)  
**Performance Goals**: Keep the existing ~60 FPS Canvas loop unless this feature is persistence-only (then: no change to the loop)  
**Constraints**: Constitution I–V always; VI–XI if generation. Types first; no React in core; player stays a loader. Feature: [extra constraints]  
**Scale/Scope**: [files and surfaces this feature changes — see placement table in technical-context.md]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Copy the gates table from `.specify/memory/technical-context.md` and mark PASS / N/A / FAIL with one line of evidence each. FAIL requires Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  List ONLY the files this feature will add or change. Use real paths from
  `.specify/memory/technical-context.md`. Do not use generic backend/frontend trees.
-->

```text
packages/types/src/
packages/core/src/          # if runtime/render/collision
packages/storage/src/       # if blob provider
apps/editor/src/lib/
apps/editor/src/app/api/
apps/editor/src/components/
apps/editor/src/stores/
apps/editor/cypress/e2e/
apps/player/src/            # only if the player loader must change
```

**Structure Decision**: Types in `packages/types`, runtime in `packages/core`, persistence/API/UI in `apps/editor`, player untouched unless the spec requires a runtime load change.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
