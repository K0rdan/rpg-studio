# Tasks: Asset Management

**Input**: Design documents from `/specs/017-asset-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/asset-management.md, quickstart.md

**Tests**: Included (constitution TDD). Write failing tests before implementation in each story.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: User story label (`US1`, `US2`, `US3`)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared usage DTO in `packages/types` (types first; no generic `Asset`)

- [x] T001 Add `AssetKind`, `AssetUsageTarget`, `AssetUsage`, and `AssetUsageResponse` in `packages/types/src/asset-usage.ts`
- [x] T002 Export the new types from `packages/types/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Project-scoped usage scan and registry vs project tileset origin, shared by preview, usage, and delete

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Add failing tests for registry vs project origin (`ts1` vs ObjectId hex) in `apps/editor/src/lib/tilesetOrigin.test.ts`
- [x] T004 Implement `resolveTilesetOrigin` in `apps/editor/src/lib/tilesetOrigin.ts` using `apps/editor/src/config/tilesets.ts`
- [x] T005 [P] Add failing usage-aggregation tests (project-scoped maps only; tileset via `tilesetId`; charset via entity `spriteId` + character `spriteId`; ignore empty ids; unique `(type, id, mapId)`; stable sort) in `apps/editor/src/lib/assetUsage.test.ts`
- [x] T006 Implement `collectAssetUsages` in `apps/editor/src/lib/assetUsage.ts`

**Checkpoint**: Origin and usage helpers match the data model without HTTP or UI

---

## Phase 3: User Story 1 - Preview a selected asset (Priority: P1) 🎯 MVP

**Goal**: Selecting a tileset or charset in Assets shows a visual preview and identifying properties in the existing editor layout; built-in tilesets are labeled; Sounds stay a non-functional placeholder.

**Independent Test**: Select a project tileset, a registry tileset, and a charset from Assets. Confirm preview + name/size (and built-in vs project). Expand Sounds and confirm it does not claim sound management.

### Tests for User Story 1

> Write these tests FIRST and confirm they FAIL before implementation

- [x] T007 [P] [US1] Add Cypress coverage: select tileset → inspector/preview; select charset → sheet/frame preview; registry tileset shows built-in; Sounds has no preview/delete affordance, in `apps/editor/cypress/e2e/asset_management.cy.ts`

### Implementation for User Story 1

- [x] T008 [P] [US1] Create `TilesetInspector` (name, tile size, image/grid preview, `origin` badge) in `apps/editor/src/components/Editor/Inspector/TilesetInspector.tsx`
- [x] T009 [P] [US1] Create `CharsetInspector` (name, frame size, thumbnail, unavailable state when `image_source` is empty) in `apps/editor/src/components/Editor/Inspector/CharsetInspector.tsx`
- [x] T010 [P] [US1] Create `CharsetPreview` (pixelated sheet + idle frame; unavailable placeholder) in `apps/editor/src/components/Editor/ContextPanel/CharsetPreview.tsx`
- [x] T011 [US1] Render `TilesetInspector` / `CharsetInspector` when `selectionStore` is `tileset` / `charset` in `apps/editor/src/components/Editor/Inspector/Inspector.tsx`
- [x] T012 [US1] Render `CharsetPreview` for `charset` selection (keep `TilePalette` for `tileset`) in `apps/editor/src/components/Editor/ContextPanel/ContextPanel.tsx`
- [x] T013 [US1] Mark Sounds as coming soon / non-functional (no selection, no generate) in `apps/editor/src/components/Editor/ProjectExplorer/AssetsTree.tsx`

**Checkpoint**: Asset selection is inspectable visually; Sounds does not pretend to work

---

## Phase 4: User Story 2 - See where an asset is used (Priority: P2)

**Goal**: The selected tileset lists maps that use it; the selected charset lists entities and characters that use it; unused is explicit; map/entity usages are clickable.

**Independent Test**: Inspect a tileset used by a map and a charset used by an entity; lists match; click opens map/entity. Inspect an unused asset; list shows unused.

### Tests for User Story 2

> Write these tests FIRST and confirm they FAIL before implementation

- [x] T014 [P] [US2] Add failing GET usage contract tests (auth, `400` bad kind, `404` unknown id, `200` unused empty array, tileset maps, charset entity+character, registry tileset still lists maps, other-project maps excluded) in `apps/editor/src/app/api/projects/[projectId]/assets/[kind]/[assetId]/usage/usage.test.ts`
- [x] T015 [P] [US2] Extend `apps/editor/cypress/e2e/asset_management.cy.ts` with unused vs in-use lists and click-through to a map usage

### Implementation for User Story 2

- [x] T016 [US2] Implement `GET` in `apps/editor/src/app/api/projects/[projectId]/assets/[kind]/[assetId]/usage/route.ts` using `collectAssetUsages` and `requireProjectAccess`
- [x] T017 [US2] Fetch and render the usage list (unused label, names, click map → `useMapStore`, click entity → map + `useEntitySelectionStore`; character rows informational only) in `apps/editor/src/components/Editor/Inspector/TilesetInspector.tsx` and `apps/editor/src/components/Editor/Inspector/CharsetInspector.tsx`

**Checkpoint**: Usage lists match project references; no reverse index

---

## Phase 5: User Story 3 - Delete unused project assets (Priority: P3)

**Goal**: Unused project tilesets/charsets can be deleted after confirm; in-use and registry assets are refused with the blocking usages shown.

**Independent Test**: Delete unused project asset → gone from Assets. Delete in-use tileset/charset → still there with usages. Registry tileset has no delete. Cancel leaves the asset.

### Tests for User Story 3

> Write these tests FIRST and confirm they FAIL before implementation

- [x] T018 [P] [US3] Add failing tileset DELETE tests: `403` registry id, `409` with project-scoped `usages`, `200` unused project tileset, other-project map must not block, in `apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/tileset.test.ts`
- [x] T019 [P] [US3] Add failing sprite DELETE tests: `409` when entity or character references remain, `204` when unused, in `apps/editor/src/app/api/projects/[projectId]/sprites/sprites.test.ts` or a colocated `apps/editor/src/app/api/projects/[projectId]/sprites/[spriteId]/sprite.test.ts`
- [x] T020 [P] [US3] Extend `apps/editor/cypress/e2e/asset_management.cy.ts` with confirm unused delete, cancel, blocked in-use delete, and no delete on registry tileset

### Implementation for User Story 3

- [x] T021 [US3] Tighten `DELETE` in `apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/route.ts` (`403` registry, project-scoped scan, `409` + `AssetUsageResponse`)
- [x] T022 [US3] Tighten `DELETE` in `apps/editor/src/app/api/projects/[projectId]/sprites/[spriteId]/route.ts` (usage guard before blob/Mongo/`$pull`)
- [x] T023 [US3] Add delete + confirmation dialog (show usages on `409`, hide delete for `origin === 'registry'`, refresh tree after success) in `apps/editor/src/components/Editor/Inspector/TilesetInspector.tsx` and `apps/editor/src/components/Editor/Inspector/CharsetInspector.tsx`
- [x] T024 [US3] Add right-click `AssetContextMenu` (Delete when allowed) in `apps/editor/src/components/Editor/ProjectExplorer/AssetContextMenu.tsx` and wire it from `apps/editor/src/components/Editor/ProjectExplorer/AssetsTree.tsx`

**Checkpoint**: Unused project assets can be removed; in-use and built-in assets cannot

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Layout regressions, focused tests, quickstart

- [x] T025 [P] Keep Assets tree Cypress in `apps/editor/cypress/e2e/editor_layout.cy.ts` compatible with the Sounds placeholder (still visible, not claimed as a library)
- [x] T026 Run focused Jest (`assetUsage`, `tilesetOrigin`, usage route, tileset/sprite DELETE) and TypeScript check for `packages/types` and `apps/editor`
- [ ] T027 Walk `specs/017-asset-management/quickstart.md` and record results at the bottom of this file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately
- **Foundational (Phase 2)**: Depends on T001–T002 — blocks all user stories
- **User Story 1**: Depends on Phase 2 origin helper — MVP
- **User Story 2**: Depends on Phase 2 `collectAssetUsages` and US1 inspectors to attach the list
- **User Story 3**: Depends on Phase 2 usage helper; UI delete is safest after US2 list exists so `409` can reuse the same rendering
- **Polish**: After the stories you intend to ship

### User Story Dependencies

- **US1 (P1)**: No dependency on US2/US3
- **US2 (P2)**: Independently testable via GET usage + helper tests even before Inspector wiring; UI mounts on US1 inspectors
- **US3 (P3)**: DELETE can be proven with Jest without UI; Inspector/menu need US1 selection and benefit from US2 usage payload shape

### Within Each User Story

- Tests MUST fail before implementation
- Types and helpers before routes
- Routes before Inspector fetch
- Guarded DELETE before exposing the button/menu

### Parallel Opportunities

- T003 and T005 after T002
- T008, T009, T010 after T004
- T014 and T015 after T006
- T018, T019, T020 after T016
- T021 and T022 after their tests (different files)

---

## Parallel Example: User Story 1

```bash
# After Phase 2:
Task: "TilesetInspector.tsx"
Task: "CharsetInspector.tsx"
Task: "CharsetPreview.tsx"

# Then sequential:
Task: "Inspector.tsx → ContextPanel.tsx → AssetsTree Sounds placeholder"
```

---

## Parallel Example: User Story 3

```bash
Task: "tileset.test.ts DELETE cases"
Task: "sprite DELETE cases"
Task: "Cypress delete flows"

# Then:
Task: "tileset DELETE route → sprite DELETE route → inspector dialog → AssetContextMenu"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 types
2. Phase 2 origin + usage helpers (usage unused in UI yet)
3. Phase 3 inspectors + charset preview + Sounds placeholder
4. **STOP**: select tileset/charset and confirm visual identification

### Incremental Delivery

1. Setup + Foundational → shared DTO and `collectAssetUsages`
2. US1 → preview (MVP)
3. US2 → usage list + click-through
4. US3 → guarded delete + context menu
5. Polish → layout regression + quickstart

### Parallel Team Strategy

1. Complete Phase 1–2 together
2. Dev A: US1 UI
3. Dev B: US2 GET usage (after T006)
4. Dev C: US3 DELETE contracts (after T006), then UI after US1

---

## Notes

- Do not add a generic `Asset` type or any Sound model
- Do not cascade-null references on delete
- Character usages are listed but have no dedicated editor to open
- Registry tilesets are previewable; never deleted
- Existing tileset/charset generation dialogs stay as they are

## Validation Results

- Shared types build passed.
- Editor production build and TypeScript check passed.
- Focused Jest: 5 suites and 36 tests passed (origin, usage aggregation/route, tileset DELETE, sprite DELETE).
- Focused ESLint passed for all changed API, helper, UI, and Cypress files.
- Cypress 16 downloaded successfully, but its macOS executable cannot start in this environment (`bad option: --no-sandbox`, `--smoke-test`, `--ping`), so T027 remains open for browser quickstart validation.
