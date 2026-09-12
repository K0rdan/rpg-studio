# Research: Layer Focus Aids

## Focus dimming vs hiding

**Decision**: Dim inactive visible layers (~0.28 opacity) instead of hiding them on selection.

**Rationale**: Overlay tiles must be placed against ground and walls. Hiding on select is faster to implement but breaks alignment.

**Alternatives considered**: Hide others (too disorienting); per-layer tint (misleading for pixel art); onion-skin of adjacent layers only (order is spatial, not temporal).

## Desaturation

**Decision**: Prefer opacity as the primary cue. Apply a light desaturation only if it stays pixel-crisp with `imageSmoothingEnabled = false`. If a canvas filter blurs tiles, ship opacity-only.

**Rationale**: Spec asks for subdued, not a grayscale mockup. Nearest-neighbor pixel art is a constitution-level constraint.

**Alternatives considered**: Offscreen grayscale pass (more memory); color overlay (washes out tilesets).

## Where to render focus

**Decision**: Optional `MapViewOptions` on `MapRenderer` / `GameEngine`, omitted by preview and player.

**Rationale**: Inactive tiles still need the real tileset draw. An editor-only overlay cannot dim existing pixels without a second tile pass.

**Alternatives considered**: CSS filter on the whole canvas (would dim entities too); duplicate renderer in the editor (forks engine behavior).

## Isolate vs persisted hide

**Decision**: Isolate is session state. It does not change `Layer.visible`. Exiting isolate restores the previous hide/show set.

**Rationale**: Users already have persistent hide. Isolate is a temporary inspection tool. Writing `visible` would dirty the map and surprise on save.

**Alternatives considered**: Solo by hiding every other layer (pollutes undo/dirty/save); a persisted `locked`/`solo` field (out of scope).

## Empty-cell markers

**Decision**: Draw them in the editor overlay (same grid math as painting), not in `MapRenderer`.

**Rationale**: Markers are not game content. Keeping them out of core avoids accidental preview/player leakage.

**Alternatives considered**: Extra layer in map data (would persist); checkerboard over the whole map (hides art).

## Discoverability of isolate

**Decision**: Modifier-click on the visibility control, with tooltip copy that names the action (for example “Isolate layer (Alt-click)”).

**Rationale**: Matches Photoshop/Aseprite muscle memory without adding a crowded extra icon in every row. Tooltip covers discoverability.

**Alternatives considered**: Extra isolate button per row (noisy); keyboard-only (easy to miss).
