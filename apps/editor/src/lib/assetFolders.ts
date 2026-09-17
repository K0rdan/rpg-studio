import type { AssetFolderKind, AssetFolders } from '@packages/types';

export const ASSET_FOLDER_KINDS: readonly AssetFolderKind[] = ['tileset', 'charset'];

const MAX_FOLDER_PATH_LENGTH = 255;

export function normalizeAssetFolderPath(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') return null;

  const normalized = value
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');

  if (
    normalized.length > MAX_FOLDER_PATH_LENGTH
    || normalized.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    return null;
  }

  return normalized;
}

export function isAssetFolderKind(value: unknown): value is AssetFolderKind {
  return ASSET_FOLDER_KINDS.some((kind) => kind === value);
}

export function listAssetFolders(
  folders: AssetFolders | undefined,
  kind: AssetFolderKind,
): string[] {
  const paths = folders?.[kind] ?? [];
  return [...new Set(paths
    .map(normalizeAssetFolderPath)
    .filter((path): path is string => path !== null && path !== ''))]
    .sort((left, right) => left.localeCompare(right));
}

export function assetFolderAncestors(path: string): string[] {
  const segments = path.split('/').filter(Boolean);
  return segments.map((_, index) => segments.slice(0, index + 1).join('/'));
}
