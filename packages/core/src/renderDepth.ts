export type DepthItemKind = 'tile-row' | 'actor';

export interface DepthRenderItem {
  id: string;
  depth: number;
  kind: DepthItemKind;
  order: number;
  render: () => void;
}

const kindOrder: Record<DepthItemKind, number> = {
  'tile-row': 0,
  actor: 1,
};

export function sortDepthItems(items: DepthRenderItem[]): DepthRenderItem[] {
  return [...items].sort((left, right) => {
    if (left.depth !== right.depth) return left.depth - right.depth;

    const kindDifference = kindOrder[left.kind] - kindOrder[right.kind];
    if (kindDifference !== 0) return kindDifference;

    return left.order - right.order;
  });
}
