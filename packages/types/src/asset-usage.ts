export type AssetKind = 'tileset' | 'charset';

export type AssetUsageTarget = 'map' | 'entity' | 'character';

export interface AssetUsage {
  type: AssetUsageTarget;
  id: string;
  name: string;
  mapId?: string;
}

export interface AssetUsageResponse {
  kind: AssetKind;
  id: string;
  origin?: 'registry' | 'project';
  usages: AssetUsage[];
}
