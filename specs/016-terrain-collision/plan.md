# Implementation Plan: Terrain Collision

**Branch**: `016-terrain-collision` | **Date**: 2026-09-12 | **Spec**: [spec.md](spec.md)

## Summary

Reuse the existing optional `TileProperties.is_collidable` flag on tilesets.
Resolve blocking cells in `packages/core` from visible below layers plus map
bounds, then apply axis-separated movement in `PlayerController`. Persist the
sparse `tiles` array through tileset GET/PATCH (with a project overlay for
static registry tilesets). The editor toggles marks in the tile palette and
can overlay the same blocking result the runtime uses.

## Technical Context

**Language/Version**: TypeScript, strict mode
**Primary Dependencies**: Native Canvas 2D, Next.js, React, Zustand, MUI
**Storage**: MongoDB tileset documents plus a project overlay for static tilesets
**Testing**: Vitest in `packages/core`, Jest and Cypress in `apps/editor`
**Target Platform**: Modern web browsers
**Project Type**: Turborepo web application and framework-agnostic engine
**Performance Goals**: Per-frame collision stays cheap on normal maps (scan occupied cells only)
**Constraints**: Types first; no React in core; backward-compatible walkable defaults; collision independent of visual overlap except below-layer participation
**Scale/Scope**: One existing tileset field, one core collision module, tileset PATCH, palette toggle, map overlay

## Constitution Check

- **Types first**: PASS — `TileProperties.is_collidable` already lives in `packages/types`; this feature uses it rather than adding a parallel model.
- **Core agnosticism**: PASS — walkability and movement resolution are pure TypeScript in `packages/core`.
- **Player minimalism**: PASS — `apps/player` keeps loading `GameEngine` and game data only.
- **Native Canvas**: PASS — overlay is editor UI; runtime collision is not a renderer.
- **Strict typing**: PASS — optional boolean with an explicit walkable default; no `any`.
- **Testing**: PASS — core collision and movement, tileset persistence, and editor overlay derivation are tested first.

Post-design check: all gates remain satisfied. No constitution violations.

## Project Structure

```text
packages/types/src/tile.ts
packages/types/src/tileset.ts
packages/core/src/terrainCollision.ts
packages/core/src/terrainCollision.test.ts
packages/core/src/PlayerController.ts
packages/core/src/PlayerController.test.ts
packages/core/src/GameEngine.ts
packages/core/src/index.ts
apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/route.ts
apps/editor/src/app/api/projects/[projectId]/tilesets/route.ts
apps/editor/src/app/api/projects/[projectId]/preview/route.ts
apps/editor/src/app/api/tilesets/route.ts
apps/editor/src/components/Editor/TilePalette/TilePalette.tsx
apps/editor/src/components/Editor/TilePalette/TileGrid.tsx
apps/editor/src/components/Editor/Canvas/MapCanvas.tsx
apps/editor/src/components/Editor/ToolBar/ToolBar.tsx
apps/editor/src/stores/editorStore.ts
specs/016-terrain-collision/
```

**Structure Decision**: Keep collision math in core so preview, play, and the
editor overlay share one function. Extend existing tileset routes instead of
adding a map-cell collision store or a new package.

## Complexity Tracking

None. Existing tileset tile properties and the current map/layer model are sufficient.
