# Tasks: Editor Preview with Direct Engine

**Branch**: `004-rpg-editor-preview` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Phase 1: Core Foundation

- [x] **T001** Update `GameEngine.init()` to accept direct data objects (Project, Maps[], Tilesets[])
- [x] **T002** Fix MapRenderer to use tileset's actual tile dimensions instead of hardcoded 32×32
- [x] **T003** Add comprehensive console logging to GameEngine initialization
- [x] **T004** Create AssetLoader class with retry logic and timeout protection
- [x] **T005** Implement AssetLoader caching mechanism
- [x] **T006** Implement programmatic fallback image generation (magenta checkerboard)
- [x] **T007** Export AssetLoader from `@packages/core`
- [x] **T008** Integrate AssetLoader into GameEngine for tileset and sprite loading

## Phase 2: Editor Integration

- [x] **T009** Create PreviewContext with play/pause/close actions
- [x] **T010** Create `/api/projects/[projectId]/preview` route
- [x] **T011** Implement data aggregation (Project + Maps + Tilesets + Characters)
- [x] **T012** Add Play button to MapEditor toolbar
- [x] **T013** Connect Play button to PreviewContext.play()
- [x] **T014** Wrap application in PreviewProvider

## Phase 3: Preview Modal

- [x] **T015** Create PreviewModal component with fullscreen MUI Dialog
- [x] **T016** Implement Slide transition for modal
- [x] **T017** Add AppBar with title and control buttons
- [x] **T018** Implement callback ref pattern for canvas mount detection
- [x] **T019** Add canvasReady state to trigger initialization
- [x] **T020** Implement useEffect for GameEngine initialization
- [x] **T021** Add Pause/Play toggle button
- [x] **T022** Add Stop/Close button
- [x] **T023** Implement cleanup on modal close

## Phase 4: Debugging Tools

- [x] **T024** Create debug information panel UI
- [x] **T025** Display maps count and active map name
- [x] **T026** Display tileset ID and available tilesets
- [x] **T027** Display layer count and painted tile count
- [x] **T028** Display map dimensions
- [x] **T029** Add tileset image load status indicator
- [x] **T030** Add warning message for empty maps
- [x] **T031** Implement "Show Grid" checkbox control
- [x] **T032** Implement "Test Pattern" checkbox control
- [x] **T033** Implement "Check Canvas" pixel analysis button
- [x] **T034** Add visual overlay rendering in separate useEffect
- [x] **T035** Add comprehensive console logging throughout preview lifecycle

## Phase 5: Data Defaults

- [x] **T036** Update map creation API to include default "Layer 1"
- [x] **T037** Initialize layer data with Array(width × height).fill(-1)
- [x] **T038** Set default tilesetId to 'ts1' for new maps
- [x] **T039** Verify 'ts1' tileset configuration in /api/tilesets

## Phase 6: Testing

- [x] **T040** Create `cypress/e2e/preview_flow.cy.ts` test file
- [x] **T041** Test: Create project and map
- [x] **T042** Test: Verify default layer creation
- [x] **T043** Test: Open preview modal
- [x] **T044** Test: Verify canvas exists with dimensions > 0
- [x] **T045** Test: Verify close button functionality
- [x] **T046** Ensure Cypress tests pass

## Phase 7: Error Handling

- [x] **T047** AssetLoader: Implement retry logic with exponential backoff
- [x] **T048** AssetLoader: Implement timeout handling
- [x] **T049** AssetLoader: Generate fallback images on all failures
- [x] **T050** GameEngine: Handle missing maps gracefully
- [x] **T051** GameEngine: Handle missing tileset with fallback
- [x] **T052** PreviewModal: Catch and log init() rejections
- [x] **T053** PreviewModal: Wait for canvas mount before initialization
- [x] **T054** Add error messages to console with full context

## Additional Enhancements

- [x] **T055** Add MapRenderer logging for tiles drawn count
- [x] **T056** Add border to canvas for visibility against black background
- [x] **T057** Style debug panel with dark theme and monospace font
- [x] **T058** Add emoji indicators for better visual feedback (✅/❌/⚠️)

## File Structure

### New Files Created
```
packages/core/src/AssetLoader.ts
apps/editor/src/context/PreviewContext.tsx
apps/editor/src/components/PreviewModal.tsx
apps/editor/src/app/api/projects/[projectId]/preview/route.ts
apps/editor/cypress/e2e/preview_flow.cy.ts
```

### Modified Files
```
packages/core/src/GameEngine.ts - AssetLoader integration, logging
packages/core/src/MapRenderer.ts - Logging, tile dimension fixes
packages/core/src/index.ts - Export AssetLoader
apps/editor/src/components/MapEditor.tsx - Play button integration
apps/editor/src/app/layout.tsx - PreviewProvider wrapper
apps/editor/src/app/api/projects/[projectId]/maps/route.ts - Default layer
```

## Success Metrics

- ✅ Preview opens immediately on Play button click
- ✅ Canvas renders with correct tileset dimensions (128×128)
- ✅ Pause/Resume controls work without lag
- ✅ Debug panel accurately reflects game state
- ✅ AssetLoader handles missing images gracefully
- ✅ Console provides clear debugging information
- ✅ E2E tests validate complete flow
- ✅ Visual debugging tools help diagnose issues
- ✅ No black screen issues with proper asset loading
