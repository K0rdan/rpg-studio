# Contract: PostProcessor

Lives in `apps/editor/src/lib/generation/postProcessor.ts`. Shared
result types live in `packages/types`. No network, no Mongo, no
prompt construction.

`RawGenerationResult` MUST never be returned to the client as a
preview or saved as a `Tileset` (constitution IX).

## Pipeline (ordered)

1. Select the geometry from the resolved output contract: `tileSize²` for a
   surface texture; documented rows × columns for a path-autotile; a declared
   prop atlas for a prop. Crop / cover-resize with pixel-art-safe sampling.
2. Optional palette PNG (`colours: 32`, `dither: 0`) — already on.
3. Branch on resolved `generationMode`:
   - **`texture`**: `verifySelfTiling` on the one canonical tile. A failure is
     a review failure; it MUST NOT be silently converted into an unrelated
     8×8 fixed block.
   - **`path-autotile`**: extract only declared slots and validate each one
     against the expected neighbouring slots in its topology contract. Do not
     self-tile edge or corner slots.
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
  outputContract: GenerationOutputContract,
): Promise<ProcessedGenerationResult>;
```

`GenerationOutputContract` is resolved by the route before prompt construction.
It contains the generation mode, canonical geometry, and, for a path-autotile,
the versioned layout id and its required slots. It is shared with PromptBuilder
so prompt geometry and post-processing geometry cannot diverge.

Edge comparison for `verifySelfTiling`: left vs right band and top vs
bottom band (one-pixel or small band), mean absolute RGB difference,
mapped to a 0–1 similarity score. Threshold is a named constant
calibrated against the Test-1 fixture (see research.md).

## Tests (Jest)

- Texture known-good fixture → `passed: true`, `tilingMode: 'individual'`.
- Deliberately mismatched surface edges → review failure.
- Required path-autotile slots validate against their documented neighbours;
  missing or failing slots are not offered in the palette.
- Prop fixture → transparent (or near-transparent) background; no
  self-tiling score.
- Output dimensions match the selected output contract.
- `ProcessedGenerationResult` is not assignable to `Tileset`.
