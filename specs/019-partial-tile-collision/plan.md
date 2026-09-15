# Implementation Plan: Partial Tile Collision

**Branch**: `019-partial-tile-collision` | **Date**: 2026-09-14 | **Spec**: [spec.md](spec.md)

## Summary

Add optional `TileProperties.collisionRect` in `packages/types`. Resolve movement in
`packages/core` as AABB vs map-space solids (full cell or rect) with a default
player feet hitbox. Persist rects through the existing tileset PATCH/overlay path.
The editor palette edits and fits rects from opaque pixels; the map overlay draws
the same solids the runtime uses. Layer participation stays 016 (visible below only).

## Technical Context

**Language/Version**: TypeScript, strict mode
**Primary Dependencies**: Native Canvas 2D, Next.js, React, Zustand, MUI
**Storage**: MongoDB tileset documents plus project overlay for static tilesets
**Testing**: Vitest in `packages/core`, Jest in `apps/editor`
**Target Platform**: Modern web browsers
**Project Type**: Turborepo web application and framework-agnostic engine
**Performance Goals**: Per-frame collision scans only cells overlapped by the feet AABB
**Constraints**: Types first; no React in core; no runtime pixel tests; below-only layers; backward-compatible full-cell default
**Scale/Scope**: One new optional field, core AABB helpers, palette rect editor, overlay rects, Fit opaque

## Constitution Check

- **Types first**: PASS — `CollisionRect` and `collisionRect?` live in `packages/types`.
- **Core agnosticism**: PASS — solids, hitboxes, fit-from-pixels math are pure TypeScript in `packages/core`.
- **Player minimalism**: PASS — `apps/player` unchanged except consuming core.
- **Native Canvas**: PASS — overlay and Fit opaque sampling are editor UI; play collision is not image-based.
- **Strict typing**: PASS — no `any`.
- **Testing**: PASS — core movement, fit math, tileset normalize/validate, overlay derivation.

Post-design check: all gates remain satisfied. Per-layer collision participation is deferred (documented, not implemented).

## Project Structure

```text
packages/types/src/tile.ts
packages/core/src/terrainCollision.ts
packages/core/src/terrainCollision.test.ts
packages/core/src/fitOpaqueCollisionRect.ts
packages/core/src/fitOpaqueCollisionRect.test.ts
packages/core/src/PlayerController.ts
packages/core/src/PlayerController.test.ts
apps/editor/src/lib/tilesetTiles.ts
apps/editor/src/lib/collisionOverlay.ts
apps/editor/src/lib/sampleTilePixels.ts
apps/editor/src/components/Editor/TilePalette/TilePalette.tsx
apps/editor/src/components/Editor/TilePalette/TileGrid.tsx
apps/editor/src/components/Editor/Canvas/MapCanvas.tsx
apps/editor/src/stores/editorStore.ts
specs/019-partial-tile-collision/
```

**Structure Decision**: Extend 016’s collision module and tileset `tiles` array rather than a new package or map-cell store.

## Complexity Tracking

None. One optional rect plus a default hitbox is sufficient. Concave solids and per-layer collision flags are explicitly deferred.
