# Contract: PromptBuilder

Pure functions in `apps/editor/src/lib/generation/promptBuilder.ts`. No network, no `sharp`, no Mongo.

Inputs are the saved visual style, a concise subject description, and
generation mode. Category, asset name, folder path, and family labels are
organizational metadata and MUST NOT enter prompt text. The description is
limited to the material or object the creator wants generated; it is not a
complete image prompt.

## Inputs

```ts
type GenerationMode = 'texture' | 'path-autotile' | 'prop';

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

Each function returns `{ prompt: string, sections: GenerationPromptSection[] }`.
`prompt` is the space-joined provider payload; `sections` is its ordered,
named source representation. The same input MUST produce both deterministically.
Each section has a stable id, a human-readable title, and non-empty text.
The persisted tileset metadata retains both values so the editor and the
development `*-prompt.txt` dump can show the component instructions separately.
The string MUST include:

- Pixel-art 2D image with dimensions determined by the output contract: one
  `style.tileSize` square for a surface texture, or the documented dimensions
  of a declared atlas for a path-autotile; do not draw visible cell dividers
- Perspective from `style.perspective`
- Optional mood sentence if `style.mood` is set
- Subject description as the content request; category, asset names, paths,
  and labels MUST NOT be used as the requested subject

Mode-specific MUST:

- **`texture`**: describe one uninterrupted material across one square patch;
  its outer image edges must wrap seamlessly. Ask for no visible cell dividers,
  competing terrain/materials, road markings, distinct objects, or centered
  focal elements. Constraints are material-aware: a cobblestone request may
  include paving stones and joints, while a compacted-earth request forbids
  large stones. Self-tiling is checked on that one canonical result.
- **`path-autotile`**: describe one parent material and a documented ordered
  atlas layout for centre, edge, corner, and applicable junction variants. It
  names topology positions but prohibits visible cell separators. It never asks
  for several kinds of path material in one image.
- **`prop`**: ask for isolated objects on a flat, uniform background
  (not a landscape); do not ask the model for real alpha.
- **`buildTransitionPrompt`**: edge/join occupancy between the two
  families (texture sheet), never prop language.

Every prompt MUST request a **new pixel-art image generated from scratch**.
`buildFamilyPrompt` MUST additionally say not to edit, recolor, copy,
transform, or modify an attached reference. It MUST identify every attachment
as a **STYLE SAMPLE only**, allowing only its rendering technique (pixel size,
grain scale, outline weight, level of detail, lighting direction) and
prohibiting reuse of its subject, layout, pattern, palette, or colors. This
keeps the requested subject authoritative even when a provider accepts image
inputs through an edit-shaped API.

`buildTransitionPrompt` is deliberately different: its two attachments are
family inputs whose palette and edge occupancy may be combined to make their
join continuous. All attached images are sent by GenerationClient, never
replaced by text-only style instructions. Reference labels MUST NOT be repeated
in prompt text; the images themselves provide the references.

## Functions

| Function | Stage | User story |
|----------|--------|------------|
| `buildBasePrompt` | First family | P1 |
| `buildFamilyPrompt` | Later family | P2 |
| `buildPathAutotilePrompt` | Path topology atlas | Phase 13 |
| `buildTransitionPrompt` | Pair edges | P3 |

## Tests (Jest)

- Same input → same output (determinism).
- Mood omitted when empty.
- Texture, path-autotile, and prop prompts differ (single seamless material,
  topology atlas, isolated described object).
- Asset name, path, and category are absent from prompts; subject description is present.
- Family prompts explicitly require a new image and style-sample-only reference use;
  transitions retain their intentional family-combination instructions.
- Family and transition prompts mention attached references, not reference labels.
- Transition prompt uses attached family images and never includes prop language.
- No function accepts a `customPrompt: string` from the client.
- Sections cover the new-image instruction, requested content, applicable
  content constraints, reference usage, and output contract; absent constraints
  are omitted rather than represented by an empty section.
