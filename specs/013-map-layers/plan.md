# Implementation Plan: Map Layers

**Branch**: `013-map-layers` | **Date**: 2026-09-11 | **Spec**: [spec.md](spec.md)

## Summary

Expose the existing ordered `Map.layers` collection in the unified editor. Add a backward-compatible visibility field, pure immutable layer operations, an Inspector panel, visibility-aware Canvas rendering, safe multi-layer resizing, and automated unit and end-to-end coverage.

## Technical Context

**Language/Version**: TypeScript 6 strict mode
**Primary Dependencies**: Next.js 16, React 19, MUI 9, Zustand 5, Canvas 2D
**Storage**: MongoDB map documents through existing project map routes
**Testing**: Jest 30, Vitest 5, Cypress 16
**Target Platform**: Modern desktop web browsers
**Project Type**: Turborepo web application with shared packages
**Performance Goals**: Preserve interactive Canvas updates while editing typical maps
**Constraints**: Existing maps stay compatible; one tileset per map; tile layers render below entities; no new runtime dependency
**Scale/Scope**: Ordered tile layers on maps up to the editor's existing 500×500 dimension limit

## Constitution Check

- PASS — Shared model changes begin in `packages/types`.
- PASS — Rendering remains framework-agnostic in `packages/core` and uses Canvas 2D.
- PASS — `apps/player` gains no business logic or dependency.
- PASS — Existing string ID and MongoDB `_id` conventions are unchanged.
- PASS — Strict TypeScript is retained without `any`.
- PASS — Logic and rendering changes receive tests before feature completion.

Post-design check: all gates remain satisfied. `visible` is optional specifically to preserve old map documents.

## Project Structure

### Documentation

```text
specs/013-map-layers/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/map-layers.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code

```text
packages/types/src/map.ts
packages/core/src/MapRenderer.ts
packages/core/src/MapRenderer.test.ts

apps/editor/src/
├── lib/mapLayers.ts
├── lib/mapLayers.test.ts
├── stores/mapStore.ts
├── stores/editorStore.ts
├── hooks/useMapEngine.ts
└── components/Editor/
    ├── Inspector/LayerPanel.tsx
    └── ContextPanel/MapProperties.tsx

apps/editor/cypress/e2e/editor_layout.cy.ts
```

**Structure Decision**: Keep shared data in `packages/types`, rendering behavior in `packages/core`, and editor-only operations and UI inside `apps/editor`. The new panel is specific to the unified editor and does not change the legacy editor.

## Design

1. Add `visible?: boolean` to `Layer`; missing means visible.
2. Implement immutable helpers for add, rename, remove, move, visibility, active-index clamping, and resize.
3. Have `mapStore` own map mutations while `editorStore` owns the active layer and dirty state.
4. Render the layer panel in map properties, in reverse visual order so the highest layer appears first.
5. Save all layer fields through the existing partial map update route.
6. Skip only `visible === false` layers in the shared renderer.
7. Keep all tile layers in the existing tile rendering pass before entities.

## Complexity Tracking

No constitution violations or additional architectural layers are required.
