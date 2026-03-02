# Phase 0: Research & Technical Validation

**Feature**: 011 — Player Entity Properties
**Date**: 2026-03-02

---

## Resolved Unknowns

### 1. What core player properties are needed for an RPG MVP?

**Decision**: The following properties cover the MVP gameplay loop for a top-down tile-based RPG. They are data-driven (stored on the entity, not hardcoded) and editable in the editor.

| Property | Default | Unit | Notes |
|---|---|---|---|
| `speed` | `4` | tiles/second | 4 tiles/s ≈ comfortable RPG walk pace |
| `health` | `100` | HP | Max HP at spawn |
| `maxHealth` | `100` | HP | Separate field to allow damage |
| `direction` | `'down'` | enum | Already exists on Entity |

**Properties intentionally excluded from MVP**:
- `mana`, `stamina` — no skill system yet
- `attackPower`, `defense` — no combat system yet
- `level` / `experience` — no progression system yet

**Accepted as Phase 2 (documented in Future Enhancements)**:
- `movementType` (walk/run/swim)
- `collisionEnabled` (toggle for debug)

---

### 2. Where does speed live today?

**Finding**: `packages/core/src/PlayerController.ts` has `private speed: number = 0.1;` hardcoded.  
The calculation is `position += direction * speed * deltaTime`. With `deltaTime` in milliseconds and speed=0.1 this was erratic — a brief keypress caused a large jump.

**Decision**: Change speed semantics to **tiles per second** (intuitive for designers). `PlayerController` will receive speed from the entity data and compute:
```
positionDelta = direction * (speed / 1000) * deltaTime   // deltaTime is ms
```
A speed of 4 tiles/second results in smooth, predictable movement.

---

### 3. Should `trigger` be on the Player entity?

**Finding**: The `trigger: TriggerType` field exists on every `Entity` and is required (non-optional). For player entities, it has no gameplay meaning — the player doesn't "trigger" like an NPC does.

**Decision**: Make `trigger` optional (`trigger?: TriggerType`) on the base `Entity` type. The player entity will omit it. No breaking change — existing entities that already have a trigger value continue to work.

---

### 4. Where to store player-specific properties?

**Options considered**:
1. Add flat fields to `Entity` (`entity.speed`, `entity.health`) — simple, but pollutes the Entity type with type-specific fields
2. Add a `playerProperties?: PlayerProperties` sub-object on `Entity` — clean separation, type-safe
3. Separate `PlayerEntity` type — requires a discriminated union refactor

**Decision**: Option 2 — `playerProperties?: PlayerProperties` sub-object. Keeps the `Entity` interface flat for NPC/trigger entities, while allowing rich player-specific data. No breaking change.

---

### 5. What does the GameLoop's `deltaTime` unit?

**Finding**: `GameLoop.ts` passes `deltaTime` computed from `performance.now()` differences = **milliseconds**.  
`PlayerController` currently does `position += dx * 0.1 * deltaTime` — with deltaTime=16ms (60fps), that's `0.1 * 16 = 1.6` tiles per frame, or ~96 tiles/second. This explains the "half-map-width on small press" bug.

**Decision**: Correct formula: `speed_tiles_per_second / 1000 * deltaTime_ms`. With speed=4: `4/1000*16 = 0.064 tiles/frame` which is smooth and predictable.
