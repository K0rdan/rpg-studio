# Contract: Layer Render Priority

## Persisted layer shape

```ts
type LayerRenderPriority = 'below' | 'same' | 'above';

interface Layer {
  name: string;
  data: number[];
  visible?: boolean;
  priority?: LayerRenderPriority;
}
```

## Compatibility

- Omitted `priority` is equivalent to `below`.
- Existing map create, read, update, preview, and export payloads carry the
  property through their existing layer arrays.

## Rendering

- `below`: visible tiles render in array order before depth items.
- `same`: visible tile rows and actors render in ascending bottom Y order.
- `above`: visible tiles render in array order after depth items.
- Visibility and focused-layer display modes apply unchanged.
