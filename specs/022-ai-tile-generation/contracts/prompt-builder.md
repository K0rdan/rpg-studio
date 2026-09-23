# Contract: PromptBuilder

Pure functions in `apps/editor/src/lib/generation/promptBuilder.ts`. No network, no `sharp`, no Mongo.

Inputs are structured fields from the spec (category, label, style,
stage, **generationMode**). Creators never pass a free-form image
prompt into these functions.

## Inputs

```ts
type GenerationMode = 'texture' | 'prop';

interface BasePromptInput {
  style: ProjectStyleSpec;
  category: TileFamilyCategory;
  label: string;
  generationMode: GenerationMode;
}

interface FamilyPromptInput extends BasePromptInput {
  /** Display labels of reference families, in the same order as images sent to the client. */
  referenceLabels: string[];
}

interface TransitionPromptInput {
  style: ProjectStyleSpec;
  familyA: { category: TileFamilyCategory; label: string };
  familyB: { category: TileFamilyCategory; label: string };
  // generationMode is always texture; omitted from the public input.
}
```

## Outputs

Each function returns `{ prompt: string }`. The string MUST include:

- Pixel-art 2D tileset, exact 8×8 cell grid, no margins/labels/borders
- Cell size matching `style.tileSize`
- Perspective from `style.perspective`
- Optional mood sentence if `style.mood` is set
- Category + label as the subject (not a dump of user prose)

Mode-specific MUST:

- **`texture`**: ask for a continuous wrapping material; cells should
  self-tile (matching left/right and top/bottom edges).
- **`prop`**: ask for isolated objects on a flat, uniform background
  (not a landscape); do not ask the model for real alpha.
- **`buildTransitionPrompt`**: edge/join occupancy between the two
  families (texture sheet), never prop language.

`buildFamilyPrompt` / `buildTransitionPrompt` MUST tell the model to
match the **attached reference image(s)** (palette, outline weight,
lighting). They MUST NOT be the sole consistency mechanism (images
are attached by GenerationClient).

## Functions

| Function | Stage | User story |
|----------|--------|------------|
| `buildBasePrompt` | First family | P1 |
| `buildFamilyPrompt` | Later family | P2 |
| `buildTransitionPrompt` | Pair edges | P3 |

## Tests (Jest)

- Same input → same output (determinism).
- Mood omitted when empty.
- Texture vs prop prompts differ (wrap vs isolated object + flat background).
- Family prompt mentions reference labels.
- Transition prompt names both families and never includes prop language.
- No function accepts a `customPrompt: string` from the client.
