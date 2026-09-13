# Implementation Plan: Editor Canvas Viewport

**Branch**: `018-canvas-viewport` | **Date**: 2026-09-13 | **Spec**: [spec.md](spec.md)

## Summary

Make the editor map viewing area fill the center workspace. Zoom scales the map through a Canvas 2D camera (`zoom` + `offsetX/Y`) instead of growing a fixed 800×600 surface. Keep existing pan (arrows, middle button, Space+drag) and add secondary-button drag plus two-finger/`wheel` pan without stealing the entity context menu on a still click.

## Technical Context

**Language/Version**: TypeScript, strict mode  
**Primary Dependencies**: Native Canvas 2D, Next.js, React, Zustand, MUI  
**Storage**: N/A (session camera only; maps unchanged)  
**Testing**: Vitest in `packages/core`, Jest in `apps/editor`, Cypress for the editor viewport  
**Target Platform**: Modern web browsers (Windows mouse + macOS trackpad)  
**Project Type**: Turborepo web application and framework-agnostic engine  
**Performance Goals**: Keep the existing ~60 FPS editor loop while resizing and panning  
**Constraints**: Types first; no React in core; no player feature work; pixel-art (no DPR scaling in this feature); do not persist viewport  
**Scale/Scope**: Camera + canvas resize in core; MapCanvas overlays and gestures; small shared `ViewportCamera` type

## Constitution Check

- **Types first**: PASS — add session-only `ViewportCamera` in `packages/types`; no persisted schema.
- **Core agnosticism**: PASS — `setCamera` / `setCanvasSize` and per-frame transform stay in `packages/core` with no React.
- **Player minimalism**: PASS — player keeps constructor `scale`; no editor pan, no new player UI.
- **Native Canvas**: PASS — camera is `CanvasRenderingContext2D.setTransform`; no extra engine.
- **Strict typing**: PASS — explicit camera fields; no `any` (avoid expanding `(window as any).scene`).
- **Testing**: PASS — camera math, resize/clear, and gesture classification (click vs pan) are tested before wiring UI.

Post-design check: all gates remain satisfied. No constitution violations.

## Project Structure

```text
packages/types/src/viewport.ts
packages/types/src/index.ts
packages/core/src/Renderer.ts
packages/core/src/Renderer.test.ts
packages/core/src/GameEngine.ts
apps/editor/src/lib/canvasCamera.ts
apps/editor/src/lib/canvasCamera.test.ts
apps/editor/src/stores/viewportStore.ts
apps/editor/src/hooks/useMapEngine.ts
apps/editor/src/hooks/useCanvasShortcuts.ts
apps/editor/src/components/Editor/Canvas/MapCanvas.tsx
apps/editor/cypress/e2e/canvas_viewport.cy.ts
specs/018-canvas-viewport/
```

**Structure Decision**: Put the camera transform and buffer resize in core so the engine and overlays share one mapping. Keep gestures, ResizeObserver, and overlay canvases in the editor. No new API routes.

## Complexity Tracking

None. One camera model replaces the current mix of CSS translate, fixed canvas size, and engine recreate-on-zoom.
