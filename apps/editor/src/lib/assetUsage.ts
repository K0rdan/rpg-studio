import type { AssetKind, AssetUsage, AssetUsageTarget } from '@packages/types';
import { ObjectId, type Db } from 'mongodb';

interface ProjectAssetRegistry {
  maps?: string[];
  characters?: string[];
}

interface StoredEntity {
  id: string;
  name: string;
  spriteId?: string;
}

interface StoredMap {
  _id: ObjectId;
  name: string;
  tilesetId?: string;
  entities?: StoredEntity[];
}

interface StoredCharacter {
  _id: ObjectId;
  name: string;
  spriteId?: string;
}

interface UsageCandidate {
  usage: AssetUsage;
  mapName?: string;
}

const TYPE_ORDER: Record<AssetUsageTarget, number> = {
  map: 0,
  entity: 1,
  character: 2,
};

function toObjectIds(ids: string[] | undefined): ObjectId[] {
  return [...new Set(ids ?? [])]
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'en');
}

function compareCandidates(left: UsageCandidate, right: UsageCandidate): number {
  const typeDifference = TYPE_ORDER[left.usage.type] - TYPE_ORDER[right.usage.type];
  if (typeDifference !== 0) {
    return typeDifference;
  }

  if (left.usage.type === 'entity' && right.usage.type === 'entity') {
    const mapDifference = compareText(left.mapName ?? '', right.mapName ?? '');
    if (mapDifference !== 0) {
      return mapDifference;
    }
  }

  const nameDifference = compareText(left.usage.name, right.usage.name);
  if (nameDifference !== 0) {
    return nameDifference;
  }

  const idDifference = compareText(left.usage.id, right.usage.id);
  if (idDifference !== 0) {
    return idDifference;
  }

  return compareText(left.usage.mapId ?? '', right.usage.mapId ?? '');
}

function usageKey(usage: AssetUsage): string {
  return `${usage.type}\u0000${usage.id}\u0000${usage.mapId ?? ''}`;
}

export async function collectAssetUsages(
  db: Db,
  project: ProjectAssetRegistry,
  kind: AssetKind,
  assetId: string,
): Promise<AssetUsage[]> {
  if (assetId.length === 0) {
    return [];
  }

  const mapIds = toObjectIds(project.maps);
  const maps = mapIds.length === 0
    ? []
    : await db.collection<StoredMap>('maps').find({ _id: { $in: mapIds } }).toArray();
  const candidates: UsageCandidate[] = [];

  for (const map of maps) {
    const mapId = map._id.toHexString();
    if (kind === 'tileset' && map.tilesetId === assetId) {
      candidates.push({
        usage: { type: 'map', id: mapId, name: map.name },
      });
    }

    if (kind === 'charset') {
      for (const entity of map.entities ?? []) {
        if (entity.spriteId === assetId && entity.spriteId.length > 0) {
          candidates.push({
            usage: {
              type: 'entity',
              id: entity.id,
              name: entity.name,
              mapId,
            },
            mapName: map.name,
          });
        }
      }
    }
  }

  if (kind === 'charset') {
    const characterIds = toObjectIds(project.characters);
    const characters = characterIds.length === 0
      ? []
      : await db
        .collection<StoredCharacter>('characters')
        .find({ _id: { $in: characterIds } })
        .toArray();

    for (const character of characters) {
      if (character.spriteId === assetId && character.spriteId.length > 0) {
        candidates.push({
          usage: {
            type: 'character',
            id: character._id.toHexString(),
            name: character.name,
          },
        });
      }
    }
  }

  const uniqueCandidates = new Map<string, UsageCandidate>();
  for (const candidate of candidates) {
    const key = usageKey(candidate.usage);
    if (!uniqueCandidates.has(key)) {
      uniqueCandidates.set(key, candidate);
    }
  }

  return [...uniqueCandidates.values()]
    .sort(compareCandidates)
    .map(({ usage }) => usage);
}
