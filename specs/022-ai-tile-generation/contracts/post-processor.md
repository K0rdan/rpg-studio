# Contract: PostProcessor

Lives in `apps/editor/src/lib/generation/postProcessor.ts`. Shared
result types live in `packages/types`. No network, no Mongo, no
prompt construction.

`RawGenerationResult` MUST never be returned to the client as a
preview or saved as a `Tileset` (constitution IX).

## Pipeline (ordered)

1. Crop / cover-resize to `(tileSize * 8)²` with nearest-neighbor
   (existing `postProcessTileSheet` geometry).
2. Optional palette PNG (`colours: 32`, `dither: 0`) — already on.
3. Branch on resolved `generationMode`:
   - **`texture`** (families and all transitions): `verifySelfTiling`
     per cell. All pass → `tilingMode: 'individual'`. Any fail or
     skip → `tilingMode: 'fixed-block'`. Set `selfTilingScore` to the
     minimum cell score in `[0, 1]`.
   - **`prop`**: `removeBackground` on the sheet (or per cell).
     `tilingMode: 'individual'`. Omit `selfTilingScore`. Do not run
     self-tiling.

Do **not** call a `GenerationClient` from this module (no auto-retry).

## Functions

```ts
function verifySelfTiling(tilePng: Buffer): { passed: boolean; score: number };

function removeBackground(imagePng: Buffer): Buffer;

function postProcessGeneratedImage(
  raw: RawGenerationResult,
  tileSize: TileSize,
  generationMode: GenerationMode,
): Promise<ProcessedGenerationResult>;
```

Edge comparison for `verifySelfTiling`: left vs right band and top vs
bottom band (one-pixel or small band), mean absolute RGB difference,
mapped to a 0–1 similarity score. Threshold is a named constant
calibrated against the Test-1 fixture (see research.md).

## Tests (Jest)

- Texture known-good fixture → `passed: true`, `tilingMode: 'individual'`.
- Deliberately mismatched edges → `passed: false`, `tilingMode: 'fixed-block'`.
- Prop fixture → transparent (or near-transparent) background; no
  self-tiling score.
- Output dimensions always `(tileSize * 8)²`.
- `ProcessedGenerationResult` is not assignable to `Tileset`.
