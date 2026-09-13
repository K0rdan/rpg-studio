# Quickstart: Asset Management

1. Open a project that has at least one map, one generated or imported tileset, and one charset assigned to an entity.
2. In Project Explorer → Assets, select a **tileset**. Confirm the tile palette/preview appears and the Inspector shows name, tile size, and built-in vs project.
3. Select a **charset**. Confirm a spritesheet (or idle frame) appears in the context panel and the Inspector shows name and frame size.
4. On the tileset used by the map, confirm the usage list names that map. Click it and confirm the map becomes the active map.
5. On the charset used by an entity, confirm the usage list names that entity. Click it and confirm the map and entity become selected.
6. Select an unused project charset or tileset. Confirm the Inspector labels it unused. Delete, confirm: it disappears from Assets.
7. Try to delete a tileset still used by a map, or a charset still used by an entity: deletion is refused and the blocking usages are listed.
8. Select the built-in registry tileset: preview and usages work; Delete is not available.
9. Expand Sounds: it remains a placeholder with no preview, usage, or delete.

## Regression checks

- Unavailable charset (`image_source` empty) stays selectable and shows an unavailable state in the tree and Inspector.
- Cancel on the delete dialog leaves the asset in the list.
- After a successful delete, usage GET for that id is `404` and maps/entities no longer offer it.
- Tileset DELETE never blocks or lists maps from another project.
- Sprite DELETE no longer removes a charset that an entity or character still references.
- Map painting, tileset generation, and charset generation keep working.
