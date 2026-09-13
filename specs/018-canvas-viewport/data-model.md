# Data Model: Editor Canvas Viewport

## Unchanged persisted model

Maps, layers, tilesets, entities, and project documents are unchanged. Zoom and pan MUST NOT appear on save, preview, or `game.json`.

## Session camera (`ViewportCamera`)

Shared TypeScript shape (not stored):

| Field | Meaning |
|---|---|
| `zoom` | Discrete editor zoom (existing steps: 0.25, 0.5, 1, 2, 4, 8). Player uses constructor scale instead. |
| `offsetX` | Camera translation in CSS pixels along X (positive moves the map right on screen). |
| `offsetY` | Camera translation in CSS pixels along Y. |

Defaults: `{ zoom: 1, offsetX: 0, offsetY: 0 }`.

## Viewing area size

| Field | Meaning |
|---|---|
| `viewWidth` | Center workspace width in CSS pixels (canvas buffer width). |
| `viewHeight` | Center workspace height in CSS pixels (canvas buffer height). |

Derived from the container, not from zoom or map dimensions. Fallback `800×600` remains only when a canvas has no layout size (player / tests).

## Coordinate mapping

With transform `setTransform(zoom, 0, 0, zoom, offsetX, offsetY)`:

- Screen (CSS pixels relative to the canvas) → world (map pixels):
  - `worldX = (screenX - offsetX) / zoom`
  - `worldY = (screenY - offsetY) / zoom`
- Tile: `floor(world / tile_size)` then clamp to map bounds for painting.

Overlays MUST use the same mapping.

## Gesture state (editor only)

| Field | Meaning |
|---|---|
| `panMode` | Idle, space-held, middle-drag, secondary-drag, wheel-pan. |
| `panOrigin` | Pointer position at drag start. |
| `didPan` | True once travel exceeds 4 CSS pixels (secondary click vs pan). |

Not persisted. Reset on `pointerup` / `pointercancel` / leaving pan.

## Transitions

- **Zoom in/out/reset**: change `zoom` only; keep offsets (reset zoom does not reset pan unless the existing reset-view shortcut is used).
- **Reset view (`Home`)**: `zoom = 1`, `offsetX = 0`, `offsetY = 0`.
- **Pan**: add pointer or key deltas to offsets. Arrow keys: 20 CSS pixels per key (existing).
- **Resize workspace**: update `viewWidth`/`viewHeight`; keep camera.
- **Switch map**: keep camera (no requirement to reset).
- **Save / preview / player**: ignore camera.
