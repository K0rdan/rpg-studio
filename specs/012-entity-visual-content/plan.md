# Implementation Plan: Entity Visual Content — Charsets & Sprites

**Branch**: `012-entity-visual-content` | **Date**: 2026-03-02 | **Spec**: [spec.md](./spec.md)

---

## Summary

Entities currently render as placeholder squares. This feature adds a proper visual pipeline:
1. Project-level **Sprite Library** — upload PNG spritesheets, stored in Azure Blob (same pattern as tilesets)
2. **Attach a sprite to an entity** — via `spriteId` on the `Entity` document (field already exists)
3. **PlayerController animation** — reads movement direction and calls `SpriteRenderer.setAnimation()` for `idle`, `walk_up/down/left/right`
4. **Editor UI** — charset upload card in EntityProperties (player), sprite picker for NPCs, and Sprites tab in Asset Manager

Standard charset convention: 4 columns × 4 rows, each frame 32×64 px (128×256 total image).

---

## Constitution Check

- ✅ **I. Respect for Types**: `Sprite` extended in `packages/types`; `GameProject` updated
- ✅ **II. Separation of Concerns**: Animation logic in `packages/core`, UI in `apps/editor`
- ✅ **III. Lightweight Player**: `apps/player` unaffected — engine loads sprites from `game.json` entity data
- ✅ **IV. Native Canvas**: `SpriteRenderer` already uses `CanvasRenderingContext2D`
- ✅ **V. TDD**: New API routes and `PlayerController` animation switching will have unit tests

---

## Technical Context

**Language**: TypeScript  
**Framework**: Next.js 15 (App Router) for editor; Pure TS for engine  
**Storage**: Azure Blob (existing `getTilesetStorage()` pattern reused for sprites)  
**Testing**: Vitest (packages/core), Chai-based (apps/editor API routes)  
**Performance Goal**: 60fps animation, ≤ 4MB sprite upload

---

## Proposed Changes

### `packages/types` — Type Definitions

#### [MODIFY] [sprite.ts](file:///Users/benjamin/Documents/_dev/_perso/rpg-studio/packages/types/src/sprite.ts)
- Add `storageKey?: string` to `Sprite` for server-side blob key
- Add `projectId?: string` for project scoping
- Add `createdAt?: Date`
- Add exported `DEFAULT_CHARSET_ANIMATIONS` constant with standard 4-direction layout

#### [MODIFY] [project.ts](file:///Users/benjamin/Documents/_dev/_perso/rpg-studio/packages/types/src/project.ts)
- Add `sprites?: string[]` to `GameProject`

---

### `packages/core` — Game Engine

#### [MODIFY] [PlayerController.ts](file:///Users/benjamin/Documents/_dev/_perso/rpg-studio/packages/core/src/PlayerController.ts)
- Add `private spriteRenderer: SpriteRenderer | null = null`
- Add `public setSpriteRenderer(sr: SpriteRenderer): void`
- In `update()`: call `spriteRenderer.update(deltaTime)` and `spriteRenderer.setAnimation(getAnimationState(dx, dy))`
- In `render()`: if `spriteRenderer`, render sprite at double tile height (32×64); else keep blue box fallback
- Add private `getAnimationState(dx, dy)` helper

#### [MODIFY] [GameEngine.ts](file:///Users/benjamin/Documents/_dev/_perso/rpg-studio/packages/core/src/GameEngine.ts)
- In `init()`, after finding player entity: if `entity.spriteId`, load the sprite via a new `loadSprite(spriteData)` helper and call `playerController.setSpriteRenderer(sr)`
- For non-player entities with `spriteId`: load sprite and create `EntityRenderer` with `SpriteRenderer` (currently this code is commented out)
- Un-comment the NPC entity renderers block, now guarded by `entity.spriteId` check

#### [NEW] PlayerController animation test extension
- `packages/core/src/PlayerController.test.ts` — add test suite for animation state switching
  - `walk_down` animation set when dy > 0
  - `idle` animation set when dx=0, dy=0

---

### `apps/editor` — API Routes

#### [NEW] `/api/projects/[projectId]/sprites/route.ts`
- `GET` — list all sprites in project (with pre-signed URLs via `getTilesetStorage()`)
- `POST` — upload spritesheet (multipart), store blob, insert MongoDB document, push to project's `sprites[]`

#### [NEW] `/api/projects/[projectId]/sprites/[spriteId]/route.ts`
- `GET` — single sprite (with URL)
- `DELETE` — delete blob + MongoDB document + remove from project

---

### `apps/editor` — React UI

#### [NEW] `SpriteUploadCard.tsx`
- `apps/editor/src/components/Editor/EntityProperties/SpriteUploadCard.tsx`
- Shows current sprite thumbnail (or placeholder silhouette)
- "Upload spritesheet" button → `input[type=file]` → POST to sprite API
- Shows upload progress + error state

#### [NEW] `SpritePicker.tsx`
- `apps/editor/src/components/Editor/EntityProperties/SpritePicker.tsx`
- Dropdown/grid of project sprites (fetched from `GET /api/projects/[projectId]/sprites`)
- Used for NPC/interactable entity types

#### [MODIFY] [EntityProperties.tsx](file:///Users/benjamin/Documents/_dev/_perso/rpg-studio/apps/editor/src/components/Editor/EntityProperties/EntityProperties.tsx)
- Player section: add `SpriteUploadCard` below `PlayerPropertiesPanel`
- Non-player section: add `SpritePicker` above the Trigger selector
- Both call `onUpdateEntity({ ...entity, spriteId: newSpriteId })`

#### [MODIFY] Asset Manager (`ContextPanel.tsx` or wherever tilesets are shown)
- Add a **Sprites** tab alongside tilesets
- Lists project sprites with thumbnail + delete button
- "Upload sprite" button → reuses `SpriteUploadCard`

---

## Verification Plan

### Automated Tests — Vitest (`packages/core`)

```bash
cd packages/core && npm run test -- --testPathPattern=PlayerController
```

**New tests** in existing `PlayerController.test.ts`:
- `setSpriteRenderer(sr)` sets animation to `walk_down` when `dy > 0`
- `setSpriteRenderer(sr)` sets animation to `idle` when `dx=0, dy=0`
- When no spriteRenderer set, render still draws placeholder (no throw)

### TypeScript Build Check

```bash
cd packages/types && npm run build
cd apps/editor && npx tsc --noEmit
```

Expected: zero type errors in changed files

### Manual Verification

1. Start editor: `cd apps/editor && npm run dev`
2. Open a project → go to Asset Manager → confirm **Sprites** tab appears
3. Upload a 128×256 PNG charset (4×4 grid of 32×64 frames) → confirm thumbnail appears
4. Open map → select Player entity → confirm charset card shows in Entity Properties
5. Attach the uploaded sprite to the Player entity → save
6. Open preview → confirm player renders the charset's `idle` frame instead of blue square
7. Hold ArrowDown → confirm walk animation plays downward
8. Hold ArrowRight → confirm rightward walk animation plays
9. Release key → confirm idle animation resumes
10. Select an NPC entity → Entity Properties shows sprite picker → assign sprite → preview shows sprite on NPC

---

## User Review Required

> [!IMPORTANT]
> **Two design decisions to confirm before implementation:**
>
> 1. **Charset convention**: The plan uses the standard *4 cols × 4 directions* layout (walk_down, walk_left, walk_right, walk_up × 4 frames each = 16 frames, 128×256 at 32×64/frame). Is this the format you plan to use, or do you have a different spritesheet format in mind?
>
> 2. **Sprite reuse scope**: Sprites are scoped to a single project. Do you want sprites to be **global** (shared across all projects in the account), or is per-project correct?
