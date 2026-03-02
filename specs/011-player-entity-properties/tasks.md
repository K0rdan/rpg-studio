# Tasks: Player Entity Gameplay Properties

**Branch**: `011-player-entity-properties` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Types (Blocking — must complete before all other phases)

- [ ] **T001** [P] Add `PlayerProperties` interface + `DEFAULT_PLAYER_PROPERTIES` constant to `packages/types/src/entity.ts`
- [ ] **T002** [P] Add `playerProperties?: PlayerProperties` field to `Entity` interface
- [ ] **T003** [P] Make `trigger?: TriggerType` optional in `Entity` interface
- [ ] **T004** [P] Export `PlayerProperties` and `DEFAULT_PLAYER_PROPERTIES` from `packages/types/src/index.ts`
- [ ] **T005** Build `packages/types` — `cd packages/types && npm run build`

## Phase 2: Core Engine (`packages/core`)

- [ ] **T006** [TDD] Create `packages/core/src/PlayerController.test.ts`
  - Test: speed=4, deltaTime=1000ms → position delta ≈ 4 tiles (horizontal)
  - Test: speed=8, deltaTime=1000ms → delta ≈ 8 tiles
  - Test: brief 16ms press (one frame at speed=4) → delta < 0.1 tiles
  - Test: speed read from `entity.playerProperties?.speed`, fallback to 4 if absent

- [ ] **T007** Update `packages/core/src/PlayerController.ts`
  - Read `speed` from `entity.playerProperties?.speed ?? DEFAULT_PLAYER_PROPERTIES.speed`
  - Fix formula: `dx * (speed / 1000) * deltaTime`

- [ ] **T008** Run core unit tests: `cd packages/core && npm run test`

## Phase 3: Editor UI (`apps/editor`)

- [ ] **T009** Update `apps/editor/src/constants/entityTemplates.ts`
  - Add `playerProperties: DEFAULT_PLAYER_PROPERTIES` to player template default
  - Remove `trigger` from player template (now optional on type)

- [ ] **T010** Create `apps/editor/src/components/Editor/EntityProperties/PlayerPropertiesPanel.tsx`
  - Speed input (number, min=1, max=20, step=0.5, label "Speed (tiles/sec)")
  - Health input (number, min=1, max=9999)
  - Max Health input (number, min=1, max=9999)

- [ ] **T011** Update `apps/editor/src/components/Editor/EntityProperties/EntityProperties.tsx`
  - Import `PlayerPropertiesPanel`
  - When `entity.type === 'player'`: show `PlayerPropertiesPanel`, hide Trigger select + CommandList
  - When other types: show Trigger + CommandList as before

## Phase 4: Verification

- [ ] **T012** TypeScript build check: `cd apps/editor && npm run build` (or `npx tsc --noEmit`)
- [ ] **T013** Update this file: mark all tasks `[x]`
