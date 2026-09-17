import type { AssetKind } from '@packages/types';

export const ASSET_DELETE_REQUEST_EVENT = 'rpgstudio:asset-delete-request';
export const ASSET_DELETED_EVENT = 'rpgstudio:asset-deleted';

export interface AssetDeleteEventDetail {
  kind: AssetKind;
  assetId: string;
}

export const readAssetDeleteEventDetail = (
  event: Event,
): AssetDeleteEventDetail | undefined =>
  (event as CustomEvent<AssetDeleteEventDetail>).detail;
