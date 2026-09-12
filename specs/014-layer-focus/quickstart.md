# Quickstart: Verify Layer Focus Aids

1. Open `/projects/{projectId}/editor` on a map with at least two layers that each have tiles in overlapping cells.
2. Select the upper layer: it stays vivid; the lower layer is subdued but still aligned.
3. Paint on the upper layer; only that layer's tiles change.
4. Confirm empty-cell markers appear only where the active layer has no tile, including cells that already have a ground tile.
5. Alt-click the visibility control to isolate; only the active tile layer remains; entities stay visible.
6. Select another layer; isolate follows it.
7. Exit isolate; previous hide/show states return and dimming resumes.
8. Save and open preview: all visible layers are full strength, with no markers.
9. Reload the editor: tiles and `visible` flags persist; isolate is off.

## Automated validation

```bash
npm run test --workspace @packages/core -- MapRenderer.test.ts
npm run test --workspace @apps/editor -- --runInBand src/lib/layerFocus.test.ts
npx tsc --noEmit -p apps/editor/tsconfig.json
```

Run the unified-editor Cypress scenario for focus, isolate, and empty-cell markers after unit checks pass.
