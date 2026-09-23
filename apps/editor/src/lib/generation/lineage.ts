import { ObjectId, type Db } from 'mongodb';

import type { GeneratedTilesetDocument } from './familyLookup';
import { familyDisplayName, generatedTilesetId } from './familyLookup';

export interface GenerationDependent {
  id: string;
  name: string;
  role: 'family' | 'transition';
  status: 'fresh' | 'stale';
}

const LINEAGE_INDEXES = [
  { projectId: 1, 'generation_metadata.sourceFamilyIds': 1 },
  { projectId: 1, 'generation_metadata.pairFamilyIds': 1 },
] as const;

export async function ensureLineageIndexes(db: Db): Promise<void> {
  const collection = db.collection('tilesets');
  await Promise.all(LINEAGE_INDEXES.map((key) => collection.createIndex(key)));
}

export async function findDependents(
  db: Db,
  projectId: string,
  familyId: string,
): Promise<GenerationDependent[]> {
  const documents = await db.collection('tilesets').find({
    projectId,
    $or: [
      { 'generation_metadata.sourceFamilyIds': familyId },
      { 'generation_metadata.pairFamilyIds': familyId },
    ],
  }).toArray() as GeneratedTilesetDocument[];

  return documents.map((document) => {
    const role = document.generation_metadata?.role === 'transition' ? 'transition' : 'family';
    return {
      id: generatedTilesetId(document),
      name: familyDisplayName(document),
      role,
      status: document.generation_metadata?.status === 'stale' ? 'stale' : 'fresh',
    };
  });
}

export async function markDependentsStale(
  db: Db,
  projectId: string,
  familyId: string,
): Promise<string[]> {
  const dependents = await findDependents(db, projectId, familyId);
  if (dependents.length === 0) {
    return [];
  }

  await db.collection('tilesets').updateMany(
    {
      projectId,
      _id: { $in: dependents.map((dependent) => new ObjectId(dependent.id)) },
    },
    { $set: { 'generation_metadata.status': 'stale', updatedAt: new Date() } },
  );
  return dependents.map((dependent) => dependent.id);
}
