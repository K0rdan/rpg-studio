# Quickstart: Verify Map Layers

1. Start the editor and open a project in `/projects/{projectId}/editor`.
2. Select a map and confirm the Inspector shows one or more layers.
3. Add a layer; confirm it is selected and empty.
4. Paint a tile, select the lower layer, and paint a different tile at the same coordinate.
5. Rename and reorder the layers; confirm their visual stacking follows the displayed order.
6. Hide the upper layer and confirm its content disappears without being deleted; reveal it again.
7. Delete one layer and confirm a valid remaining layer stays selected; confirm the last layer cannot be deleted.
8. Save, reload, and confirm names, order, visibility, and tile data persist.
9. Resize the map and confirm every layer retains in-bounds tiles and has the new grid size.
10. Open preview and confirm visible layers render below entities.

## Automated validation

```bash
npm run test --workspace @apps/editor -- --runInBand src/lib/mapLayers.test.ts
npm run test --workspace @packages/core -- MapRenderer.test.ts
npm run lint --workspace @apps/editor
npm run build --workspace @packages/core
```

Run the editor Cypress suite for the unified editor after unit checks pass.
