# Implementation Plan: Layer Focus Aids

**Branch**: `014-layer-focus` | **Date**: 2026-09-11 | **Spec**: [spec.md](spec.md)

## Summary

Add editor-only presentation for tile layers: dim inactive visible layers when one is selected, allow temporary isolate of the active layer, and mark empty cells of that layer. Saved maps, preview, and the player keep full-strength rendering.

## Technical Context

**Language/Version**: TypeScript 6 strict mode
**Primary Dependencies**: Next.js 16, React 19, MUI 9, Zustand 5, Canvas 2D
**Storage**: None; no new persisted fields
**Testing**: Jest 30, Vitest 5, Cypress 16
**Target Platform**: Unified editor at `/projects/{projectId}/editor`
**Project Type**: Turborepo web application with shared packages
**Performance Goals**: Keep interactive map painting at the current editor frame rate
**Constraints**: `packages/core` stays framework-agnostic; player and preview must not receive focus options; pixel-art rendering stays nearest-neighbor
**Scale/Scope**: Typical editor maps up to the existing 500×500 tile limit

## Constitution Check

- PASS — No new shared game data; presentation state stays in the editor session.
- PASS — Canvas 2D only; optional view options on `MapRenderer` default to current player behavior.
- PASS — `apps/player` is unchanged.
- PASS — Strict TypeScript; no `any`.
- PASS — Unit tests for view filtering/opacity and empty-cell occupancy; Cypress for the editor workflow.

Post-design check: gates remain satisfied. Isolate does not write `visible` on layers.

## Project Structure

### Documentation

```text
specs/014-layer-focus/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/layer-focus.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code

```text
packages/core/src/MapRenderer.ts
packages/core/src/MapRenderer.test.ts
packages/core/src/GameEngine.ts

apps/editor/src/
├── lib/layerFocus.ts
├── lib/layerFocus.test.ts
├── stores/editorStore.ts
├── hooks/useMapEngine.ts
├── components/Editor/Canvas/MapCanvas.tsx
└── components/Editor/Inspector/LayerPanel.tsx

apps/editor/cypress/e2e/editor_layout.cy.ts
```

**Structure Decision**: Compute which layers are full-strength vs subdued in a pure helper. Apply that policy in `MapRenderer` only when the editor passes view options. Draw empty-cell markers in the editor canvas overlay so the player path never sees them.

## Design

1. Keep `Layer.visible` as the only persisted visibility flag.
2. Add editor session flags: `isolateLayers` on `editorStore`, plus existing `activeLayer`.
3. `MapViewOptions` (focus index, isolate, inactive opacity) flow editor → `GameEngine` → `MapRenderer`.
4. Preview constructs `GameEngine` without those options.
5. Empty-cell overlay uses active-layer `data[i] === -1` and the same tile grid as painting.
6. Alt-click (and a documented tooltip) on the row visibility control toggles isolate without flipping `visible`.

## Complexity Tracking

No constitution violations. Optional renderer view options are justified because dimming must share the real tile pass; defaults preserve player rendering.
