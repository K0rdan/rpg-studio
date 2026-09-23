# Research: AI Tile Generation

## Decision: First shippable image provider is Gemini; GPT is the second true image-to-image provider; Claude cannot generate tiles

**Decision**: Implement `GenerationClient` with three ids (`gemini`, `gpt`, `claude`). Wire **Gemini** first (`gemini-2.5-flash-image` via existing `@google/genai`). Add **GPT** using OpenAI Images (`gpt-image-1` family: `POST /v1/images/generations` for the first family, `POST /v1/images/edits` with one or more reference files for later families). **Claude** implements the same interface but always throws a mapped *unavailable* error: Anthropic’s Messages API accepts images for vision only and does not emit pixel images.

**Rationale**: Gate VII forbids text-only style lock after the first family. Gemini already generates tiles in this repo and accepts `inlineData` parts plus text (`responseModalities: ['Image']`) — that is real image-conditioned generation. GPT `images.edit` documents “generate a new image using other images as a reference” (up to 16 PNG/JPEG/WebP files). Using Claude as an orchestrator that calls another model would leak brick VIII and still would not make Claude a pixel provider. FR-012 is “choose among *available* models”; FR-015 covers unavailable ones.

**Alternatives considered**:
- Treat Claude as a prompt rewriter — rejected (PromptBuilder is deterministic; constitution VIII).
- Delay GPT until a later story — acceptable incrementally, but the interface must already require `referenceImages` so Gemini i2i is not a special case.
- Azure OpenAI vs public OpenAI — keep a thin HTTP client with base URL + API key env so either endpoint can be configured later without a second adapter.

### Request shapes (adapters only)

**Gemini** (`@google/genai` `models.generateContent`):
- First family: `contents` = prompt string (current pattern).
- Later: `contents` parts = `{ inlineData: { mimeType, data: base64 } }` for each reference **then** `{ text: prompt }`. Prefer `inlineData` over Files API (i2i has failed silently with `fileData` in community reports).
- Config: `responseModalities: ['Image']`, `imageConfig.aspectRatio: '1:1'`.
- Output: first `candidates[0].content.parts[].inlineData.data` → `RawGenerationResult` bytes.

**GPT** (multipart, no SDK required for the thin client):
- First family: `POST /v1/images/generations` with `model`, `prompt`, `size` nearest to the 8×8 sheet, `output_format=png`.
- Later: `POST /v1/images/edits` with `model`, `prompt`, `image[]` = reference PNG buffers, optional `input_fidelity=high`.
- Output: `data[0].b64_json`.

**Claude**: no generate call; `isAvailable()` is false unless a future Anthropic image model appears.

## Decision: Family sheet is 8×8 tiles (64 cells); same PostProcessor geometry for families and transitions

**Decision**: Keep the current 8-column × 8-row sheet. Target pixel size = `tileSize * 8` square. Transitions use the same sheet size; PromptBuilder instructs edge/join occupancy rather than a second geometry.

**Rationale**: One PostProcessor path; existing generate route already resizes to this size; maps can paint from a 64-tile atlas immediately.

**Alternatives considered**: RPG Maker autotile 47-blob or 4×4 blob — better joins, but a new crop layout and palette UX in the same iteration. Deferred.

## Decision: Controlled categories and adjacency (config in code, not creator-edited)

**Decision**: Categories: `ground | water | elevation | vegetation | structure | decoration`.

Proactive transition offers (FR-007a) for unordered pairs:
- `ground`–`ground`, `ground`–`water`, `ground`–`vegetation`, `ground`–`elevation`
- `water`–`water`, `vegetation`–`vegetation`, `elevation`–`elevation`
- `structure`–`ground`

Never proactive: any pair involving `decoration`; `structure`–`water` / `structure`–`elevation` / `structure`–`vegetation`. Creators MAY still request any pair explicitly (spec edge case).

**Rationale**: Spec says adjacency is planning configuration. These pairs match typical overworld painting (floors, water, grass, cliffs, buildings on ground).

**Alternatives considered**: Creator-edited adjacency — out of scope. Suggest every pair — noisy.

## Decision: Lineage lives on `tilesets.generation_metadata`, not a new collection

**Decision**: Optional fields on existing metadata (see data-model.md). Dependents = project-scoped query on `sourceFamilyIds` / `pairFamilyIds`. Imported tilesets omit the fields.

**Rationale**: Matches “no new collection”, types-first, backward compatible. AssetGraph in constitution X is this graph of ids, not a separate Mongo collection in this iteration.

**Alternatives considered**: `generation_edges` collection — extra joins for little gain at current scale.

## Decision: Palette quantization stays a later PostProcessor step; use sharp with dither 0

**Decision**: Story 1 PostProcessor = exact crop to `tileSize * 8` and origin-aligned grid (drop remainder pixels; fail if smaller than one tile). Quantization increment: `sharp(png).png({ palette: true, colours: 32, dither: 0 })`. Do not introduce pngquant as a second binary unless visual tests show sharp still dithers or smears hard edges at `dither: 0`.

**Rationale**: FR-009 allows deferral. Sharp is already a generate-route dependency. Issue lovell/sharp#4063: artifacts were dither; `dither: 0` removed them. Sharp cannot pin an *external* palette from the first family without a custom remap; cross-family palette lock stays a future increment.

**Alternatives considered**: Always quantize in Story 1 — extra visual risk on the MVP path. Custom nearest-color remap to first-family palette — better consistency, more code; after quantization increment if needed.

## Decision: Unavailable / quota errors map to one editor-facing code

**Decision**: Providers throw `GenerationUnavailableError` with `reason: 'rate_limit' | 'quota' | 'not_supported' | 'misconfigured' | 'upstream'`. Routes return **409** for `not_supported` / `misconfigured` when the chosen model cannot run, **429** for `rate_limit`, **402** or **409** for `quota` (pick **409** + message so the UI does not imply payment checkout), **502** for `upstream`. Never persist a usable tile. Do not auto-retry in the route (creator retries).

Provider signals:
- OpenAI: HTTP 429 `rate_limit_exceeded` vs `insufficient_quota` (do not retry quota).
- Gemini: HTTP 429 `RESOURCE_EXHAUSTED`.
- Anthropic (if ever called): HTTP 429 `rate_limit_error` — unused while Claude is `not_supported`.

**Rationale**: FR-015 needs one UX: “this model cannot be used; pick another.”

## Decision: Extend existing REST resources; add PATCH on the project document

**Decision**: Keep `POST .../tilesets/generate` and `POST .../tilesets/save-generated`. Add **PATCH** on `GET/DELETE .../projects/:projectId` for `styleSpec` and `generationModel` (no dedicated style route). Dependents are included on **GET** `.../tilesets/:tilesetId` as `dependents[]` so regenerate UI needs no extra path. Charset `generate` / `save-generated` unchanged.

**Rationale**: Technical context prefers extending existing paths. Project currently has no PATCH; style is project-scoped, so PATCH is the smallest new method on an existing resource.

**Alternatives considered**: Nested `/generation/families` API — cleaner domain, duplicates tileset persistence. Rejected for this iteration.

## Decision: Default model is Gemini when the key is present

**Decision**: `GameProject.generationModel` optional; if missing, use Gemini when `GEMINI_API_KEY` is set, else the first provider whose `isAvailable()` is true. Per-request override in the generate body only.

**Rationale**: Matches current env and Story 5 independence (Stories 1–4 work without the model picker).

## Decision: Keep `GameProject.generationModel`; do not add `modelPreference`

**Decision**: Project default remains optional `generationModel?: GenerationModelId`. A nested `{ defaultProvider }` object is rejected.

**Rationale**: Already persisted, PATCHed, and covered by tests. Renaming would be a compatibility break with no product gain. Spec FR-012 is satisfied by this field plus per-request `model`.

**Alternatives considered**: `modelPreference.defaultProvider` as in an earlier data-model draft — dropped.

## Decision: Category implies generation mode; three categories stay creator-choice

**Decision**: Config in `apps/editor/src/lib/generation/category-config.ts` (not `packages/types`):

| Category | Mode |
| --- | --- |
| `ground`, `water` | `texture` only |
| `decoration` | `prop` only |
| `elevation`, `vegetation`, `structure` | creator chooses `texture` or `prop` |

Implied categories: server fills the mode; conflicting client value → 400. Creator-choice: `generationMode` required on generate/save → 400 if omitted. Transitions are always `texture` (join sheets), regardless of the two families’ modes.

**Rationale**: FR-017. Grass-as-vegetation can be a tiling meadow (`texture`) or a tree clump (`prop`); that is a creator intent, not a taxonomy rule.

**Alternatives considered**: Hardcode vegetation as texture — too lossy. Default creator-choice to texture when omitted — hides the choice and makes US1 vegetation/grass silently texture.

## Decision: Self-tiling verification then fixed-block fallback; no automatic model retry

**Decision**: After crop/grid-snap, `texture` (including transitions) runs `verifySelfTiling` on each extracted cell: compare left↔right and top↔bottom edge bands (mean absolute difference in RGB, score mapped to 0–1). Calibrate the pass threshold against a known-good Test-1 fixture before locking it. If any cell fails, or verification is skipped: `tilingMode: 'fixed-block'`. If all pass: `individual`. Persist `selfTilingScore` as the minimum cell score (diagnostic only).

The generate route does **not** re-call the model on failure (same policy as provider errors: the creator retries). The preview still returns; the UI MUST state individually reusable vs fixed-block before accept (FR-019). Prop mode skips verification, omits `selfTilingScore`, and uses `tilingMode: 'individual'` (each cell is a variant, not a wraparound material).

**Rationale**: FR-018 forbids presenting failed texture cells as reusable tiles. FR-019 allows fallback. Auto-retry would hide cost and still might fail.

**Alternatives considered**: Reject the preview entirely on fail — worse UX than an honest stamp. Change `tile_width` to the full sheet so the map has one giant cell — breaks mixed 32px painting and the player blit path.

## Decision: Fixed-block is an editor stamp, not a core / tile-size change

**Decision**: Keep `tile_width` / `tile_height` = `styleSpec.tileSize` and keep the PNG as an 8×8 atlas. `packages/core` and `apps/player` stay unchanged. When `generation_metadata.tilingMode === 'fixed-block'`, the map **palette** shows one swatch; the **brush** writes the 64 GIDs in atlas order as an 8×8 block from the clicked cell (clipped to the map). **Fill** is disabled for that tileset in this iteration (avoids flooding the map with stamps). Imported tilesets and metadata without `tilingMode` keep per-cell picking and fill.

**Rationale**: Constitution II/III and the plan’s “no core / player” constraint. The player already renders atlas cells; “non-decomposable” is a creation-time picking rule, not a new runtime primitive.

**Alternatives considered**: Multi-tile stamp engine in core — out of scope. Single 256×256 map tile — cannot sit on a 32px map grid.

## Decision: Prop background removal is local PostProcessor; 8×8 variant atlas kept

**Decision**: `removeBackground` (alpha threshold and/or chroma-key from a sampled near-uniform background, typically corners) runs after crop/grid-snap for `prop` only. Spec already accepts fringing. Prop families still occupy the same 8×8 sheet: 64 decorative variants, not a single object PNG. PromptBuilder must ask for isolated objects on a flat background, not a wrapping ground texture.

**Rationale**: One PostProcessor geometry (research sheet decision). FR-020 forbids trusting model transparency.

**Alternatives considered**: One-cell prop sheets — second crop layout this iteration. Dedicated matting library — only if sharp threshold/chroma tests fail against the Test-2 fixture.

