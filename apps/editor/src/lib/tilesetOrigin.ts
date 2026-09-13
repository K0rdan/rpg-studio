import { getTilesetById } from '@/config/tilesets';

export type TilesetOrigin = 'registry' | 'project';

export function resolveTilesetOrigin(tilesetId: string): TilesetOrigin {
  return getTilesetById(tilesetId) ? 'registry' : 'project';
}
