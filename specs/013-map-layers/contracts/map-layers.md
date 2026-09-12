# Map Layer Persistence Contract

No new endpoint is introduced. Layer changes use the existing map update route:

`PUT /api/projects/{projectId}/maps/{mapId}`

## Layer update payload

```json
{
  "layers": [
    {
      "name": "Ground",
      "data": [-1, 0, -1, 4],
      "visible": true
    }
  ],
  "width": 2,
  "height": 2
}
```

## Invariants

- `layers` contains at least one item.
- Every name is non-empty after trimming.
- Every data array has `width × height` entries.
- Missing `visible` is accepted and means visible.
- Array order is rendering order from lowest to highest.
- Partial updates that do not include `layers` preserve existing layers.

## Compatibility

Existing map documents require no migration. Clients and renderers interpret absent visibility as `true`.
