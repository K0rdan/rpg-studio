# Phase 0: Research & Technical Validation

**Feature**: 012 — Entity Visual Content (Charsets & Sprites)
**Date**: 2026-03-02

---

## 1. RPG Charset Convention

**Decision**: Use the standard RPG Maker-style charset layout as the baseline.

Standard layout for a charset image:
- **4 columns** of animation frames (walking cycle)  
- **3 rows** of directions: `walk_down` (row 0), `walk_left` (row 1), `walk_right` (row 2), `walk_up` (row 3)
- Default frame size: **32px wide × 64px tall** per frame (1 tile wide, 2 tiles tall)

| Animation   | Frame indices (flat)  |
|-------------|----------------------|
| `idle`      | [1] (centre frame of walk_down — frame index 1) |
| `walk_down` | [0, 1, 2, 3] |
| `walk_left` | [4, 5, 6, 7] |
| `walk_right`| [8, 9, 10, 11] |
| `walk_up`   | [12, 13, 14, 15] |

> With 4 columns and 4 rows → 16 total frames. Image size = 128×256 px.

**Rationale**: This is the most widely understood convention for 2D RPG charsets. Designers can use any compatible tileset tool (RPG Maker, LDtk, Tiled character generators, etc.)

---

## 2. How does `SpriteRenderer` already work?

**Finding**: `SpriteRenderer` already supports arbitrary `animations: Record<string, number[]>` and frame-based rendering from a spritesheet. It has `setAnimation(name)` and `update(deltaTime)`.

**Decision**: No changes to `SpriteRenderer` needed. We just need to pass it a `Sprite` object with the correct animations map and the loaded `HTMLImageElement`.

---

## 3. Where to store the Charset definition?

**Options considered**:

| Option | Pros | Cons |
|---|---|---|
| Inline on Entity | Simple, no extra collection | Duplicated if same charset used by multiple entities |
| Project-level "sprites" collection | Reusable across entities on any map | Slightly more complex query |
| Extend existing `characters` collection | Characters already exist | Mixing visual assets with game-logic characters is confusing |

**Decision**: New **`sprites` collection** in MongoDB, scoped to a project. A project has a `sprites: string[]` array (parallel to `tilesets`). Entity references sprite via `spriteId` (field already exists on `Entity`).

---

## 4. Player Charset vs. Generic Sprite — same or separate?

**Decision**: Use the **same `Sprite` type** for both. The player's charset is just a `Sprite` with an RPG-standard 4-direction animation map. No separate `Charset` type is needed — this avoids adding complexity to `packages/types` unnecessarily.

The Player entity will reference the same `spriteId` field. The player template's default `animations` map will follow the charset convention above.

---

## 5. How does storage work for binary assets?

**Finding**: `lib/storage.ts` exports `getTilesetStorage()` which returns either `AzureTilesetStorage` or `InMemoryTilesetStorage` (for tests/dev without Azure credentials). The pattern is clean and well-abstracted via `TilesetStorage` interface.

**Decision**: Reuse the exact same storage abstraction. The `TilesetStorage` interface stores/retrieves images by `storageKey`. Since a "sprite" is functionally the same as a "tileset" from storage's perspective (a PNG blob), we will use `getTilesetStorage()` for both, storing sprites under a different key prefix (`sprites/<projectId>/<filename>`).

---

## 6. Animation in PlayerController

**Finding**: `PlayerController.update()` reads `dx`/`dy` but doesn't call anything animation-related. The engine renders the player as a blue square with a 🎮 emoji.

**Decision**: `PlayerController` needs a `SpriteRenderer | null` field. When set:
- Moving down → `setAnimation('walk_down')`
- Moving left → `setAnimation('walk_left')`
- Moving right → `setAnimation('walk_right')`
- Moving up → `setAnimation('walk_up')`
- Stationary → `setAnimation('idle')`

`GameEngine.init()` will load the player entity's sprite (if `spriteId` is set) and pass the `SpriteRenderer` to the `PlayerController`.

---

## 7. Constitution Compliance

- ✅ **I. Respect for Types**: `Sprite` changes go in `packages/types`. No new type added if we can extend `Sprite`.
- ✅ **II. Separation of Concerns**: Engine animation logic stays in `packages/core`, UI in `apps/editor`.
- ✅ **III. Lightweight Player**: `apps/player` loads `game.json` — sprites are loaded by the engine via `AssetLoader`.
- ✅ **IV. Native Canvas**: Animation rendered via `CanvasRenderingContext2D` through `SpriteRenderer`.
- ✅ **V. TDD**: New sprite upload API + PlayerController animation switcher will have unit tests.
