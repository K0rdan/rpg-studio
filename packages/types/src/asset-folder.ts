import type { AssetKind } from './asset-usage';

export type AssetFolderKind = AssetKind;

export type AssetFolders = Partial<Record<AssetFolderKind, string[]>>;

export interface AssetFolder {
  kind: AssetFolderKind;
  path: string;
}
