# Implementation Plan: Player Entity Gameplay Properties

**Branch**: `011-player-entity-properties` | **Date**: 2026-03-02 | **Spec**: [spec.md](./spec.md)

---

## Summary

Player movement speed is hardcoded in `packages/core` and the speed calculation uses wrong units, causing the player to jump half a map width on a brief keypress. This feature makes player properties (speed, health, maxHealth) data-driven: defined on the entity in the editor, persisted in MongoDB, and consumed by the game engine at runtime. It also cleans up the Entity Properties panel to hide irrelevant Trigger/Commands fields for the player entity.

---

## Constitution Check

- ✅ **I. Respect for Types**: New `PlayerProperties` type goes into `packages/types` first.
- ✅ **II. Separation of Concerns**: Engine changes in `packages/core`, UI changes in `apps/editor`. No React in core.
- ✅ **III. Lightweight Player**: No change to `apps/player`. GameEngine already handles entity loading.
- ✅ **IV. Prioritize Native Canvas**: No external engine used.
- ✅ **V. TDD**: New `PlayerController` tests will be written covering speed correctness.

---

## Proposed Changes

### `packages/types` — Type Definitions

#### [MODIFY] [entity.ts](file:///Users/benjamin/Documents/_dev/_perso/rpg-studio/packages/types/src/entity.ts)
- Add `PlayerProperties` interface (`speed`, `health`, `maxHealth`)
- Add `DEFAULT_PLAYER_PROPERTIES` constant
- Add `playerProperties?: PlayerProperties` to `Entity` interface
- Change `trigger: TriggerType` → `trigger?: TriggerType` (make optional)

---

### `packages/core` — Game Engine

#### [MODIFY] [PlayerController.ts](file:///Users/benjamin/Documents/_dev/_perso/rpg-studio/packages/core/src/PlayerController.ts)
- Read `speed` from `entity.playerProperties?.speed ?? DEFAULT_PLAYER_PROPERTIES.speed`
- Fix speed formula: `dx * (speed / 1000) * deltaTime` (tiles/second with ms deltaTime)
- Remove hardcoded `private speed: number = 0.1`

#### [NEW] PlayerController.test.ts
- `packages/core/src/PlayerController.test.ts`
- Test: player at speed=4 moves ~4 tiles after 1000ms of held input
- Test: player at speed=8 moves twice as far as speed=4
- Test: brief 16ms press (one frame) moves only `4/1000*16 ≈ 0.064` tiles

---

### `apps/editor` — Editor UI & Templates

#### [MODIFY] [entityTemplates.ts](file:///Users/benjamin/Documents/_dev/_perso/rpg-studio/apps/editor/src/constants/entityTemplates.ts)
- Add `playerProperties: DEFAULT_PLAYER_PROPERTIES` to the player entity template default
- Remove `trigger` field from the player template (it's now optional and unused for player)

#### [MODIFY] [EntityProperties.tsx](file:///Users/benjamin/Documents/_dev/_perso/rpg-studio/apps/editor/src/components/Editor/EntityProperties/EntityProperties.tsx)
- Add a `PlayerPropertiesPanel` section shown only when `entity.type === 'player'`
  - Speed (number input, min 1, max 20, step 0.5)
  - Health (number input, min 1, max 9999)
  - Max Health (number input, min 1, max 9999)
- Hide `Trigger` `<Select>` and `<CommandList>` when `entity.type === 'player'`

#### [NEW] PlayerPropertiesPanel.tsx
- `apps/editor/src/components/Editor/EntityProperties/PlayerPropertiesPanel.tsx`
- Reusable sub-component with the three numeric sliders/inputs

---

## Verification Plan

### Automated Tests — Jest (packages/core)

Run from `packages/core`:
```bash
cd packages/core
npm run test -- --testPathPattern=PlayerController
```

**New tests in `PlayerController.test.ts`**:
- `speed=4, deltaTime=1000ms → position delta ≈ 4 tiles`
- `speed=8, deltaTime=1000ms → position delta ≈ 8 tiles`
- `speed from entity.playerProperties is used, not fallback`
- `brief deltaTime=16ms → tiny movement (< 0.1 tile)`

### TypeScript Build Check (packages/types)

```bash
cd packages/types && npm run build
```

Expected: zero type errors. Confirm `trigger?` optional doesn't break existing entity usages (all existing entities already have a `trigger` value, so optional is backward-compatible).

### Manual Verification — Editor + Preview

1. Start `apps/editor`: `cd apps/editor && npm run dev`
2. Open a project, select a map with a Player entity
3. Click the Player entity → Entity Properties panel should show:
   - ✅ **Speed** (default 4), **Health** (default 100), **Max Health** (default 100)
   - ❌ **No Trigger dropdown**
   - ❌ **No Commands section**
4. Change Speed to `2`. Save.
5. Click "Preview" / launch game preview
6. Hold an arrow key for ~1 second → verify player moves slowly (≈2 tiles)
7. Change Speed to `8`. Preview again.
8. Hold an arrow key for ~1 second → verify player moves faster (≈8 tiles)
9. Select an NPC entity → verify Trigger + Commands are still visible
