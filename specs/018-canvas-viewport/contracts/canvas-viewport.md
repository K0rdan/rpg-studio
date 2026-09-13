# Canvas Viewport Contract

No new HTTP endpoint. Map PUT/GET payloads MUST NOT include zoom, pan, or viewing-area size.

## Engine API (`packages/core`)

```ts
interface ViewportCamera {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

class GameEngine {
  setCamera(camera: ViewportCamera): void;
  setCanvasSize(width: number, height: number): void;
}
```

- `setCamera` MUST take effect on the next rendered frame without `init()` or reconstructing the engine.
- Each frame MUST clear in identity space using the current canvas buffer size, then apply `setTransform(zoom, 0, 0, zoom, offsetX, offsetY)` before drawing the world.
- Omitted camera (player default): `{ zoom: constructorScale, offsetX: 0, offsetY: 0 }`.
- `setCanvasSize` MUST update the buffer and `Renderer` clear size. Width/height ≤ 0 are ignored.
- Preview and player MUST NOT receive editor pan. They MAY keep constructor `scale`.

## Editor viewport store

Existing actions remain: `setZoom`, `zoomIn`, `zoomOut`, `resetZoom`, `pan`, `setOffset`, `resetViewport`.

`useMapEngine` MUST call `setCamera` when zoom or offsets change instead of depending on zoom for engine construction.

## Pointer and keyboard (viewing area)

| Input | Result |
|---|---|
| `+` / `=` | Zoom in |
| `-` / `_` | Zoom out |
| `0` | Reset zoom (offsets unchanged) |
| `Home` | Reset zoom and offsets |
| Arrow keys | Pan 20px if not typing and no dialog focus |
| Middle-button drag | Pan |
| Space + primary drag | Pan; no paint / entity place |
| Secondary drag (≥ 4px) | Pan; no context menu |
| Secondary click (< 4px) on entity | Existing entity menu |
| Secondary click on empty cell | No menu, no pan |
| Two-finger / wheel over view (`ctrlKey` false) | Pan by `-deltaX/-deltaY`; no zoom |
| Wheel + `ctrlKey` | Ignored (no pinch zoom) |

`contextmenu` on the viewing area: prevent the browser menu. Show the entity menu only for a secondary click that did not pan.

## Overlays

Empty-cell, collision, and entity overlay canvases MUST share the map canvas buffer size and camera transform.

## Persistence

A map round trip after zooming and panning MUST equal the map as edited. Viewport state is discarded on reload.
