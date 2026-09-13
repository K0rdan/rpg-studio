# Implementation Plan: Asset Management

**Branch**: `017-asset-management` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

## Summary

Reuse the existing Assets tree and `selectionStore` (`tileset` / `charset`).
Add inspector panels for preview metadata, on-demand usage, and guarded
delete. Compute usages by scanning the project's maps, nested entities, and
characters — no reverse index. Tighten existing DELETE routes so charset
delete matches tileset delete (block when referenced). Built-in registry
tilesets stay read-only. Sounds stay a non-functional placeholder.

Ship in the spec order: preview (P1), usage (P2), delete (P3).

## Technical Context

**Language/Version**: TypeScript, strict mode
**Primary Dependencies**: Next.js, React, Zustand, MUI
**Storage**: MongoDB + Azure Blob (existing tileset/sprite documents)
**Testing**: Jest colocated with editor API routes; Cypress for explorer inspect/usage/delete flows
**Target Platform**: Modern web browsers (editor)
**Project Type**: Turborepo web application (editor-only feature)
**Performance Goals**: Usage scan of a project's maps/entities/characters returns in one request; no editor-wide reindex
**Constraints**: Types first; no React in `packages/core`; no player-app changes; no generic Asset type until sounds exist; deletion never leaves dangling writes (block, do not cascade)
**Scale/Scope**: Inspector + context preview + usage GET + DELETE guards; context menu; Sounds explicitly out of scope

## Constitution Check

- **Types first**: PASS — add a shared usage DTO in `packages/types` (`AssetKind`, `AssetUsage`, `AssetUsageResponse`). Do not invent a generic `Asset` union.
- **Core agnosticism**: PASS — preview, usage, and delete live in `apps/editor`. `packages/core` is untouched.
- **Player minimalism**: PASS — `apps/player` is untouched.
- **Native Canvas**: PASS — previews are editor `<img>` / existing tile palette, not a new engine.
- **Strict typing**: PASS — discriminated usage records; no `any` on the new API surface.
- **Testing**: PASS — usage aggregation and DELETE conflict cases are tested before UI wiring; Cypress covers the three user stories.

Post-design check: all gates remain satisfied. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/017-asset-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── asset-management.md
└── tasks.md              # /speckit.tasks — not created here
```

### Source Code (repository root)

```text
packages/types/src/asset-usage.ts
packages/types/src/index.ts
apps/editor/src/lib/assetUsage.ts
apps/editor/src/lib/assetUsage.test.ts
apps/editor/src/app/api/projects/[projectId]/assets/[kind]/[assetId]/usage/route.ts
apps/editor/src/app/api/projects/[projectId]/assets/[kind]/[assetId]/usage/usage.test.ts
apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/route.ts
apps/editor/src/app/api/projects/[projectId]/sprites/[spriteId]/route.ts
apps/editor/src/components/Editor/Inspector/Inspector.tsx
apps/editor/src/components/Editor/Inspector/TilesetInspector.tsx
apps/editor/src/components/Editor/Inspector/CharsetInspector.tsx
apps/editor/src/components/Editor/ContextPanel/ContextPanel.tsx
apps/editor/src/components/Editor/ContextPanel/CharsetPreview.tsx
apps/editor/src/components/Editor/ProjectExplorer/AssetsTree.tsx
apps/editor/src/components/Editor/ProjectExplorer/AssetContextMenu.tsx
apps/editor/cypress/e2e/asset_management.cy.ts
```

**Structure Decision**: Keep Tileset and Sprite as separate persisted types.
Unify only the *behavior* (usage + guarded delete) behind `assetUsage` and one
usage route. Extend existing tileset/sprite DELETE instead of a new asset
CRUD resource. Editor UI fills the Inspector / Context Panel slots already
selected by spec 009.

## Complexity Tracking

None. Existing documents and selection types are sufficient.
