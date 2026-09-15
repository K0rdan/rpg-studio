import type { AssetKind } from '@packages/types';

/**
 * Same-origin URL for an asset image stored in the storage account.
 *
 * Asset bytes are served by the editor itself rather than linked directly on the
 * storage host: a cross-origin URL would need CORS rules on that host, would expire
 * with its signature, and would taint every canvas the editor samples pixels from.
 */
export function assetImageUrl(projectId: string, kind: AssetKind, assetId: string): string {
  return `/api/projects/${projectId}/assets/${kind}/${assetId}/image`;
}
