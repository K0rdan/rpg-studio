# Contract: GenerationClient

Lives in `apps/editor/src/lib/generation`. Shared request/result **types** live in `packages/types`.

`RawGenerationResult` is **not** a `Tileset`. Routes MUST run PostProcessor before any preview or save (gate IX).

## Types (`packages/types`)

```ts
export type GenerationModelId = 'gemini' | 'gpt' | 'claude';

export interface GenerationReferenceImage {
  tilesetId: string;
  mimeType: 'image/png';
  bytes: Uint8Array;
}

export interface GenerationClientRequest {
  model: GenerationModelId;
  prompt: string; // from PromptBuilder only
  referenceImages: GenerationReferenceImage[]; // empty iff first family
  /** Hint for providers that need an output size; canonical geometry is chosen
   * by the generation mode/output contract, not assumed to be an 8×8 sheet. */
  tileSize: 16 | 32 | 64 | 128;
}

export interface RawGenerationResult {
  mimeType: 'image/png';
  bytes: Uint8Array;
  model: GenerationModelId;
}

// Not part of this brick — see contracts/post-processor.md
export interface ProcessedGenerationResult {
  mimeType: 'image/png';
  bytes: Uint8Array;
  generationMode: 'texture' | 'path-autotile' | 'prop';
  tilingMode: 'individual' | 'fixed-block';
  reviewPassed: boolean;
  selfTilingScore?: number;
}

export type GenerationUnavailableReason =
  | 'rate_limit'
  | 'quota'
  | 'not_supported'
  | 'misconfigured'
  | 'upstream';
```

## Interface

```ts
interface GenerationClient {
  readonly model: GenerationModelId;
  isAvailable(): boolean;
  generate(request: GenerationClientRequest): Promise<RawGenerationResult>;
}
```

## Invariants

1. `generate` MUST NOT crop, snap, quantize, verify self-tiling, or remove backgrounds (PostProcessor).
2. `generate` MUST NOT build or rewrite the prompt (PromptBuilder).
3. If `referenceImages.length === 0`, the adapter MAY use text-only generation (first family only). The **orchestrating route** MUST reject empty references when the project already has an accepted `role: 'family'` tileset (gate VII).
4. If `referenceImages.length >= 1`, the adapter MUST send those bytes to the provider as images (Gemini `inlineData` parts, GPT `images.edit` files). It MUST NOT drop them and restate style in text.
   The provider endpoint name does not change their semantic role: for later
   families, PromptBuilder defines them as technique-only style samples and
   requires a newly generated image rather than an edit of an input image.
5. Claude: `isAvailable()` is `false`; `generate` throws `not_supported`.
6. Missing API key: `misconfigured`.
7. Mapped HTTP failures: see research.md (429 rate_limit, quota, 502 upstream).

## Factory

`getGenerationClient(model: GenerationModelId): GenerationClient` — one implementation module per provider. Orchestrator never imports `@google/genai` or OpenAI URLs directly.
