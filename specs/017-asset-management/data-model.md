# Data Model: Asset Management

## Existing types (unchanged shape)

### Tileset (`packages/types` Tileset)

Used as-is: `id`, `name`, `image_source`, `tile_width`, `tile_height`, optional generation metadata.

Inspector-derived (not persisted):

- `origin`: `'registry'` when the id is a static registry tileset; `'project'` when it is a Mongo-backed project tileset.

### Sprite / charset (`packages/types` Sprite)

Used as-is: `id`, `name`, `image_source`, `frame_width`, `frame_height`, `animations`, optional `storageKey`, `projectId`, `generation_metadata`.

`image_source === ''` is the unavailable state.

### Map, Entity, Character

Usage sources:

- `Map.tilesetId` → tileset
- `Entity.spriteId?` → charset
- `Character.spriteId` → charset (`''` means none)

## New shared types (`packages/types`)

```ts
export type AssetKind = 'tileset' | 'charset';

export type AssetUsageTarget = 'map' | 'entity' | 'character';

export interface AssetUsage {
  type: AssetUsageTarget;
  id: string;
  name: string;
  mapId?: string; // required when type === 'entity'
}

export interface AssetUsageResponse {
  kind: AssetKind;
  id: string;
  origin?: 'registry' | 'project'; // tilesets only
  usages: AssetUsage[];
}
```

Validation:

- `kind` MUST be `tileset` or `charset`.
- `id` MUST be a non-empty string.
- Entity usages MUST include `mapId`.
- `usages` MUST be unique by `(type, id)` (and `mapId` for entities).
- Order: maps, then entities (grouped by map name), then characters — stable by name then id.

## Derived: unused

An asset is unused when `usages.length === 0`. Unused is a view state, not a stored flag.

## Delete outcomes (not persisted)

| Case | Result |
|------|--------|
| Project tileset or charset, `usages.length === 0` | Document + blob removed; id pulled from `project.tilesets` or `project.sprites` |
| Any usages | No mutation; conflict payload includes `usages` |
| Registry tileset | No mutation |
| Unknown id | Not found |

## Editor session state (not persisted)

- `selectionStore.type` `'tileset' | 'charset'` and `id`
- Inspector loads usage for the current selection
- Delete confirmation dialog (asset name + usage summary)

Sounds have no model in this feature.
