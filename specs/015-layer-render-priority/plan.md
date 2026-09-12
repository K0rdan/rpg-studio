# Implementation Plan: Layer Render Priority

**Branch**: `015-layer-render-priority` | **Date**: 2026-09-11 | **Spec**: [spec.md](spec.md)

## Summary

Add a backward-compatible render priority to shared map layers. Split map
rendering into below, same-depth, and above passes; interleave same-depth tile
rows with player and entity renderers using their bottom Y coordinate. Expose
the priority in the editor layer panel and persist it with the existing map.

## Technical Context

**Language/Version**: TypeScript, strict mode
**Primary Dependencies**: Native Canvas 2D, Next.js, React, Zustand, MUI
**Storage**: Existing MongoDB map documents
**Testing**: Vitest in `packages/core`, Jest and Cypress in `apps/editor`
**Target Platform**: Modern web browsers
**Project Type**: Turborepo web application and framework-agnostic engine
**Performance Goals**: Preserve interactive 60 FPS rendering on normal maps
**Constraints**: Backward compatible documents; no React in core; no collision coupling
**Scale/Scope**: One additional layer property, one renderer pipeline, one editor control

## Constitution Check

- **Types first**: PASS — priority is defined in `packages/types`.
- **Core agnosticism**: PASS — composition remains Canvas 2D TypeScript.
- **Player minimalism**: PASS — no player-app dependency or business logic.
- **Native Canvas**: PASS — no external rendering engine.
- **Strict typing**: PASS — the priority is a closed union with exhaustive handling.
- **Testing**: PASS — core rendering and editor mutations receive unit coverage.

Post-design check: all gates remain satisfied.

## Project Structure

```text
packages/types/src/map.ts
packages/core/src/MapRenderer.ts
packages/core/src/GameEngine.ts
packages/core/src/renderDepth.ts
apps/editor/src/lib/mapLayers.ts
apps/editor/src/stores/mapStore.ts
apps/editor/src/components/Editor/Inspector/LayerPanel.tsx
specs/015-layer-render-priority/
```

**Structure Decision**: Extend the existing shared map model, renderer, map
mutation helpers, and unified layer panel. No new package or dependency is needed.
