# Contract: PromptBuilder

Pure functions in `apps/editor/src/lib/generation/promptBuilder.ts`. No network, no `sharp`, no Mongo.

Inputs are the saved visual style, a concise subject description, and
generation mode. Category, asset name, folder path, and family labels are
organizational metadata and MUST NOT enter prompt text. The description is
limited to the material or object the creator wants generated; it is not a
complete image prompt.

## Inputs

```ts
type GenerationMode = 'texture' | 'prop';

interface BasePromptInput {
  style: ProjectStyleSpec;
  subjectDescription: string; // 1–200 characters
  generationMode: GenerationMode;
}

type FamilyPromptInput = BasePromptInput;

interface TransitionPromptInput {
  style: ProjectStyleSpec;
}
```

## Outputs

Each function returns `{ prompt: string }`. The string MUST include:

- Pixel-art 2D image with dimensions `(style.tileSize * 8)²`, used as an
  implicit 8×8 extraction atlas; do not draw cell dividers or a visible grid
- Perspective from `style.perspective`
- Optional mood sentence if `style.mood` is set
- Subject description as the content request; category, asset names, paths,
  and labels MUST NOT be used as the requested subject

Mode-specific MUST:

- **`texture`**: describe one uninterrupted material across the full atlas;
  outer image edges must wrap seamlessly and neighboring cells must appear
  continuous across implicit boundaries. Ask for no visible cell dividers,
  competing terrain/materials, paths, stones, distinct objects, or centered
  focal elements. Per-cell self-tiling is checked after generation.
- **`prop`**: ask for isolated objects on a flat, uniform background
  (not a landscape); do not ask the model for real alpha.
- **`buildTransitionPrompt`**: edge/join occupancy between the two
  families (texture sheet), never prop language.

`buildFamilyPrompt` / `buildTransitionPrompt` MUST tell the model to
match the **attached reference image(s)** (palette, outline weight,
lighting). They MUST NOT be the sole consistency mechanism (images
are attached by GenerationClient). Reference labels MUST NOT be repeated
in prompt text; the images themselves provide the references. Transition
prompts rely on their two attached images rather than family names/categories.

## Functions

| Function | Stage | User story |
|----------|--------|------------|
| `buildBasePrompt` | First family | P1 |
| `buildFamilyPrompt` | Later family | P2 |
| `buildTransitionPrompt` | Pair edges | P3 |

## Tests (Jest)

- Same input → same output (determinism).
- Mood omitted when empty.
- Texture vs prop prompts differ (seamless material vs isolated described object).
- Asset name, path, and category are absent from prompts; subject description is present.
- Family and transition prompts mention attached references, not reference labels.
- Transition prompt uses attached family images and never includes prop language.
- No function accepts a `customPrompt: string` from the client.
