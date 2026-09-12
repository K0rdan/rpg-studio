# Layer Focus Presentation Contract

No new HTTP endpoint. Save payloads stay the 013 map layer contract.

## Editor → engine

The unified editor may pass optional view options when updating the live map:

```ts
interface MapViewOptions {
  focusLayerIndex: number;
  isolate: boolean;
  inactiveOpacity: number; // editor default 0.28
}
```

Omitted or default options MUST match today's renderer: every layer with `visible !== false` draws at opacity 1.

## Persistence

`PUT /api/projects/{projectId}/maps/{mapId}` MUST NOT include focus, isolate, opacity, or empty-cell fields.

A round trip of `layers` after using focus/isolate MUST equal the layers as edited (names, order, `visible`, `data`), not the subdued presentation.

## Preview and player

`GET /api/projects/{projectId}/preview` and the player runtime MUST render visible layers at full strength. They never receive `MapViewOptions`.

## Isolate vs visibility

| User action | Persisted `visible` | Session `isolateLayers` |
|---|---|---|
| Hide/show eye | Changes | Unchanged |
| Isolate / exit isolate | Unchanged | Changes |
| Save | Stores `visible` only | Discarded |
