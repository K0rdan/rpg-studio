# Feature Specification: AI Tile Generation

**Feature Branch**: `022-ai-tile-generation`
**Created**: 2026-09-17
**Status**: Draft
**Input**: Let 2D RPG creators generate visually consistent tileset families (base terrain, additional families, and transitions) inside the editor, using project style settings and previously accepted images as visual references, without needing advanced art skills.

## User Scenarios & Testing

### User Story 1 - Set project style and generate the first family (Priority: P1)

As a game creator, I define the project's tile size, perspective, and optional mood once, then generate a first terrain family (for example grass). After I accept it, I have a paint-ready set of tiles and a visual reference for everything that follows.

**Why this priority**: Nothing else in this feature has meaning until a style exists and one accepted family can serve as the project's visual anchor. This slice is a usable MVP on its own.

**Independent Test**: On a project with no generated families, save a style (tile size + perspective), request a `texture` in the `vegetation` category described as "short dense green grass", give the asset a name and folder path, review it, accept it, and confirm the tiles appear at the chosen size and grid in that folder.

**Acceptance Scenarios**:

1. **Given** a project with no style yet, **When** the creator sets tile size, perspective, and optionally a short mood, **Then** that style is stored on the project and is reused automatically on later generations.
2. **Given** a saved project style, **When** the creator starts a new generation, **Then** they are not asked to re-enter tile size or perspective.
3. **Given** a saved style and no accepted family, **When** the creator requests a first family by picking an organizational category, entering a short material/object description, choosing a generation mode when available, and specifying an asset name and folder path, **Then** the system generates that described content and presents it for review, including whether it is individually reusable or a fixed-block stamp.
4. **Given** a first-family preview, **When** the creator accepts it, **Then** those tiles become usable in the project, that family becomes the project's visual reference for later generations, and its status is recorded as fresh.
5. **Given** a first-family preview, **When** the creator rejects it or asks for another attempt, **Then** the rejected result is not stored as a usable tile set.
6. **Given** any image presented as a usable tile, **When** the creator inspects it, **Then** its dimensions and grid alignment match the project style exactly.

---

### User Story 2 - Generate another family in the same visual language (Priority: P2)

As a game creator, I request another described material (for example muddy dirt or deep blue water), classify it, name it, and choose where to store it. The result looks like it belongs with the family I already accepted, and I can accept it or try again.

**Why this priority**: Visual continuity across families is the core product promise. It depends on P1 but does not require transitions.

**Independent Test**: With one accepted family, request a new family in category `ground` with description "muddy brown soil with small pebbles", compare it to the first family, accept it, and confirm both remain independently usable.

**Acceptance Scenarios**:

1. **Given** at least one accepted family, **When** the creator requests a new family by picking an organizational category and entering a material/object description, **Then** generation uses that description and one or more accepted family images; the category is not treated as the requested visual subject.
2. **Given** a new-family preview, **When** the creator compares it to existing accepted families, **Then** they can accept it into the project or request another generation without the preview becoming a usable tile set.
3. **Given** two accepted families in the same project, **When** a reviewer looks at them side by side, **Then** they share a consistent visual language (perceived palette, style, and level of detail) without the creator having retouched pixels.
4. **Given** a project style, **When** a later family is accepted, **Then** its usable tiles still match that style's tile size and grid alignment.
5. **Given** two accepted families whose categories are marked as commonly-adjacent (for example two `ground` categories), **When** both exist in the project, **Then** the creator is proactively offered the option to generate a transition between them.

---

### User Story 3 - Generate transition tiles between two families (Priority: P3)

As a game creator, once I have at least two accepted families, I request transition tiles between a pair (for example grass toward dirt) so adjacent regions on a map meet cleanly.

**Why this priority**: Transitions complete a mappable tileset but are optional until two families exist. P1 and P2 must remain shippable without this story.

**Independent Test**: With two accepted families and no transitions yet, request transitions for that pair, accept them, and paint the two families next to each other using the new edge tiles. Confirm a visually continuous join. Do this without regenerating either family.

**Acceptance Scenarios**:

1. **Given** fewer than two accepted families, **When** the creator looks for transition generation, **Then** it is unavailable (or refused) with a clear reason.
2. **Given** two accepted families, **When** the creator requests transitions between them, **Then** both families are used as visual references and a set of edge/join tiles is produced for review.
3. **Given** a transition preview, **When** the creator accepts it, **Then** those tiles become usable for mapping the boundary between the two families, and the transition set's status is recorded as fresh.
4. **Given** accepted transition tiles, **When** the two families are painted as adjacent regions on a map, **Then** the join appears visually continuous rather than a hard, mismatched cut.

---

### User Story 4 - Regenerate a family with impact awareness (Priority: P4)

As a game creator, I can regenerate a family I am not happy with. Before I confirm, I see which other generated elements depend on it (especially transitions), so I understand the blast radius. Dependents are never silently regenerated on my behalf.

**Why this priority**: Adjustment is how creators iterate, but it is unsafe without lineage. It requires at least one accepted family; it does not require implementing a new generation type.

**Independent Test**: Accept a base family and a second family plus a transition that depends on both. Start regenerate on the base family and confirm the transition (and any other dependents) are listed before confirm. Cancel once (nothing changes), then confirm and verify the base family is replaced while the transition remains untouched but marked stale.

**Acceptance Scenarios**:

1. **Given** an accepted family with no dependents, **When** the creator regenerates it, **Then** they can review a new result and accept or discard it without being blocked.
2. **Given** an accepted family that other generated elements reference, **When** the creator starts regeneration, **Then** those dependents are listed by name (including transitions) before confirmation, with a plain-language explanation that they will not be updated automatically.
3. **Given** that impact list, **When** the creator cancels, **Then** the original family and all dependents stay unchanged, and no status changes.
4. **Given** that impact list, **When** the creator confirms and later accepts a new result, **Then** the family is replaced, its status is set to fresh, its recorded references are updated, and every dependent element's status is set to stale.
5. **Given** an element marked stale, **When** the creator views it in the editor, **Then** it remains fully usable for mapping and is visually flagged so the creator can decide whether to regenerate it.
6. **Given** a stale element, **When** the creator regenerates it using its current references, **Then** its status returns to fresh upon acceptance.
7. **Given** a stale element, **When** the creator takes no action, **Then** the system never regenerates it automatically and never removes it from the project.

---

### User Story 5 - Choose which AI model to use (Priority: P5)

As a game creator, I pick which available AI model to use for the project by default, and I can override that choice for a single generation, based on availability and cost.

**Why this priority**: Model choice is a preference around the generation stories; those stories must work with a default model even if this UI is not done.

**Independent Test**: Set a project-level model, run one generation with that default, then run another generation with a different model selected only for that request. Confirm the project default did not change.

**Acceptance Scenarios**:

1. **Given** more than one model available, **When** the creator sets a project default, **Then** subsequent generations use that model unless overridden.
2. **Given** a project default, **When** the creator picks another available model for one generation, **Then** only that generation uses the override.
3. **Given** a model that is unavailable or over quota, **When** the creator tries to use it, **Then** they are told it cannot be used and can pick another available model.
4. **Given** no available models, **When** the creator tries to generate, **Then** generation is refused with a clear explanation.

### Edge Cases

- Generation is refused until a project style with tile size and perspective is saved.
- Changing tile size or perspective after families exist is either refused or requires an explicit confirmation that existing tiles will no longer match the style until regenerated.
- A generation that fails or is interrupted MUST NOT leave a partial image stored or shown as a usable tile.
- The creator MUST NOT submit a complete free-form image prompt. A concise material/object description is allowed as functional generation input; category, style, generation mode, and attached references remain structured inputs.
- Asset names are organizational metadata. Duplicate names are allowed; identity and regeneration use the asset id, not the name or category.
- Transition generation for a pair that already has accepted transitions is treated as regeneration of that transition set, with the same impact awareness as family regeneration.
- Only accepted families count as visual references; rejected previews MUST NOT become references.
- If the only remaining accepted family is deleted through existing asset-management rules, later family generation behaves as a new first family (no image reference available).
- Usable generated tiles remain ordinary project tilesets for mapping, preview, and usage tracking already provided by the editor.
- Category pairings that are not commonly adjacent (for example `decoration` and `elevation`) are not proactively suggested for transitions, but the creator MAY still request a transition between any two accepted families explicitly.
- A stale status is informational only: it never restricts painting, exporting, or otherwise using the affected tiles.
- Stale status does not propagate transitively beyond direct dependents in this iteration (regenerating a family marks its direct transitions stale; it does not attempt to infer further indirect effects).
- A `texture`-mode generation whose extracted tiles fail self-tiling verification is either retried, rejected, or falls back to fixed-block mode (FR-019); it is never silently presented as individually reusable tiles.
- Background removal on `prop`-mode results is approximate (alpha threshold / chroma-key based); the creator MAY see minor fringing and this is an accepted limitation for this iteration, not a blocking defect.

## Requirements

### Functional Requirements

- **FR-001**: Creators MUST be able to save a per-project style specification that includes tile size, perspective, and an optional short mood/theme.
- **FR-002**: Subsequent generations in that project MUST reuse the saved style without the creator re-entering it.
- **FR-003**: Creators MUST complete generation entirely inside the editor; they MUST NOT be required to configure an external automation tool for sequencing, anchoring, or finishing tiles.
- **FR-004**: Creators MUST request a family by choosing a controlled organizational category, providing a concise material/object description, and supplying an asset name and folder path. The description specifies generated content; the name and folder path are metadata only. Creators MUST NOT submit a complete free-form image prompt.
- **FR-005**: The first accepted family in a project MUST become the visual reference for later generations.
- **FR-006**: Every generation after the first family MUST use at least one previously accepted generated image as a visual reference, together with the material/object description. Style continuity MUST NOT be attempted by restating style in text alone. Category, asset name, and folder path MUST NOT be used as substitutes for the content description in the prompt.
- **FR-007**: Transition generation MUST be offered only when at least two families are accepted, and MUST use both families of the requested pair as visual references.
- **FR-007a**: When two accepted families belong to categories configured as commonly-adjacent, the system MUST proactively offer transition generation for that pair.
- **FR-008**: Creators MUST be able to review a result and either accept it as usable project tiles or discard it and request another generation.
- **FR-009**: No generated image MAY be stored or shown as a usable tile until it has been fitted to the project tile size and snapped to the style grid. Palette tightening is desirable but MAY wait for a later iteration.
- **FR-010**: Each accepted family and transition set MUST record which reference image(s) were used to produce it.
- **FR-011**: Before regenerating an accepted family or transition set, the system MUST show which other generated elements depend on it, in plain language, before the creator confirms.
- **FR-011a**: Regenerating an accepted family or transition set MUST NOT automatically regenerate its dependents. Dependents MUST instead be marked stale.
- **FR-011b**: Every accepted family and transition set MUST carry a status of either fresh or stale. Status MUST be visible to the creator wherever that element is presented for reuse or mapping.
- **FR-012**: Creators MUST be able to choose an available model (Claude, GPT, or Gemini) as a project default and override it per generation.
- **FR-013**: A generation MUST remain independently completable: first family without a second family; additional family without transitions; transitions without regeneration.
- **FR-014**: Accepted generated tiles MUST be available for mapping like other project tilesets, regardless of fresh or stale status.
- **FR-015**: When a chosen model is unavailable, generation MUST fail clearly and MUST NOT produce a usable tile.
- **FR-016**: Categories MUST come from a controlled, extensible list (for example: ground, water, elevation, vegetation, structure, decoration) rather than free-form text, so the system can determine which pairs are commonly adjacent for FR-007a.
- **FR-017**: Family generation MUST distinguish two generation modes: `texture` (continuous, self-tiling ground material) and `prop` (isolated decorative object). The category taxonomy (FR-016) determines the applicable mode(s) per category (for example `ground` and `water` are `texture`-only; `decoration` is `prop`-only; `vegetation` and `structure` MAY offer either, decided during planning).
- **FR-018**: For `texture` mode, the system MUST verify that each extracted tile is self-tileable (its edges are compatible with themselves in repetition) before it can be presented as a usable tile. Tiles failing this check MUST NOT be offered for acceptance as individual reusable tiles.
- **FR-019**: If self-tiling verification is not available or not passing for a given generation, the system MAY fall back to treating the generated result as a single fixed block (a non-decomposable N×M pattern placed as one unit), rather than individually reusable tiles. The creator MUST be informed which mode (individually reusable vs fixed block) the accepted result uses.
- **FR-020**: For `prop` mode, the system MUST remove or neutralize the generated background locally (the system MUST NOT rely on the generative model producing a genuinely transparent background), before the object can be composited onto ground tiles or shown as a usable decoration.
- **FR-021**: In `texture` mode, the prompt MUST describe one uninterrupted material covering the full image as a seamless tileable texture, without visible grid lines or dividers. The pattern MUST be continuous across the implicit cell boundaries and wrap across the image's outer edges. It MUST prohibit competing terrain/materials, paths, stones, distinct objects, and centered focal elements. These content exclusions are texture-only; prop and transition prompts retain their mode-specific content instructions. Individual extracted tiles are independently verified before being offered as reusable tiles under FR-018.
- **FR-022**: A creator MUST provide a concise description of the desired material in `texture` mode or desired object in `prop` mode. The description MUST be bounded to 200 characters and MUST be incorporated as the content subject in generation prompts. Category, asset name, and folder path are classification/storage metadata and MUST NOT appear as the requested subject in generation prompts.
- **FR-023**: A creator MUST be able to set the generated tileset's asset name and folder path before acceptance. Regeneration MUST preserve these values unless the creator changes them.

### Key Entities

- **Project style**: The project's fixed visual contract for generated tiles (tile size, perspective, optional mood). Reused for every generation in the project.
- **Tile family**: An accepted set of tiles with an asset name, folder path, organizational category, and generation description. Category controls transition suggestions and applicable generation modes. Name and path control asset organization; the description controls requested content. The family carries a **generation mode** (`texture` or `prop`) and a **tiling mode** (`individual` or `fixed-block`). A `texture` family is either individually reusable self-tiling-verified tiles, or — as a fallback — one non-decomposable 8×8 stamp in the map palette. A `prop` family is isolated objects with background removed by local post-processing. It may be a visual reference for later families and transitions, and has a fresh or stale status.
- **Transition set**: An accepted set of edge/join tiles that belongs to a specific pair of families and depends on both. Always treated as `texture` for generation and post-processing. Carries a **status** of fresh or stale, independent of the status of the two families it joins.
- **Generation preview**: A not-yet-accepted result. Visible for review; not a usable tile set and not a reference until accepted.
- **Generation lineage**: The recorded links from each accepted family or transition set to the reference image(s) used to create it, used to regenerate, to warn about impact, and to determine which elements to mark stale after a regeneration.
- **Model preference**: The project-default (`generationModel`) and optional per-generation choice among available AI models.

## Assumptions

- This iteration covers **tileset terrain families and their pairwise transitions** only.
- **Charset generation** (still poses or animations) is out of scope for this iteration even though the working title mentioned charset; no charset user journey is specified.
- Tile sizes offered include at least 16×16 and 32×32; other square sizes MAY be offered if the editor already supports them.
- Perspective values include at least top-down and 3/4.
- A "family" is a paint-ready set of tiles for one terrain type, not a single decorative tile. The exact number of variants per family is chosen during planning so the set is usable on a map.
- The category list and which category pairs count as commonly-adjacent are configuration, not something the creator edits in this iteration; the initial list and adjacency rules are chosen during planning.
- Which categories are texture-only, prop-only, or creator-choice is the same kind of fixed configuration (`ground`/`water` → texture, `decoration` → prop, `elevation`/`vegetation`/`structure` → creator choice).
- A failed or skipped self-tiling check does not change map tile size: the sheet stays an 8×8 atlas; the editor palette presents it as one stamp.
- Project default model is stored as `generationModel` on the project (not a nested preference object).
- Palette and lighting are derived from the project style and from accepted reference images; creators do not pick a palette swatch in this iteration.
- Model availability and cost are whatever the studio has configured; this feature surfaces the choice, not billing account management.
- Regenerating a family does not silently regenerate dependents; the creator is warned, dependents are marked stale, and the creator decides what to regenerate next.
- Stale status is a signal, not a restriction; it never blocks use of the affected tiles.
- Existing import of creator-owned assets remains available; this feature does not replace import.
- Generated assets follow existing project asset rules (usage, delete protection, folders) once accepted.

## Out of Scope

- Manual pixel editing of generated tiles inside the editor
- Charset or character animation generation (walk, attack, and similar)
- Multi-user collaborative generation on the same project
- Auto-placing generated tiles onto a map without the creator painting
- Training or fine-tuning custom models
- Using external no-code orchestrators for the generation workflow itself
- Creator-defined or creator-edited category lists and adjacency rules (fixed configuration in this iteration)
- Automatic or cascading regeneration of stale dependents

## Success Criteria

### Measurable Outcomes

- **SC-001**: After accepting two families generated separately in the same project, a reviewer judges them visually consistent in palette, style, and scale without any manual pixel retouch by the creator.
- **SC-002**: After accepting transition tiles for a pair of families, painting those families as adjacent regions yields a visually continuous join rather than a hard mismatched edge.
- **SC-003**: 100% of images delivered as usable tiles match the project style's tile dimensions and grid alignment.
- **SC-004**: In 100% of regeneration attempts on a family that has dependents, the creator sees those dependents listed before they confirm, and 100% of those dependents are marked stale (never auto-regenerated) once the regeneration is accepted.
- **SC-005**: A creator can go from an empty project style to one accepted family without leaving the editor and without generating any later-stage asset.
- **SC-006**: A creator who is not a specialist artist can obtain two accepted families and their transition tiles in a single editing session using category, concise content descriptions, asset name/path, style settings, and accept/retry—without composing complete image prompts.
- **SC-007**: When two accepted families belong to commonly-adjacent categories, the creator is offered a transition suggestion without having to already know that transitions are possible.
