import type { TilesetStorage } from '@packages/storage';
import type {
  GenerationMode,
  GenerationReferenceImage,
  TileFamilyCategory,
  TilingMode,
} from '@packages/types';
import type { Db, Document, WithId } from 'mongodb';

export type GeneratedTilesetDocument = WithId<Document> & {
  projectId: string;
  name?: string;
  storageLocation?: string;
  createdAt?: Date;
  generation_metadata?: {
    generated?: boolean;
    role?: string;
    category?: TileFamilyCategory;
    label?: string;
    generationDescription?: string;
    status?: string;
    sourceFamilyIds?: string[];
    pairFamilyIds?: [string, string];
    generated_at?: Date;
    generationMode?: GenerationMode;
    tilingMode?: TilingMode;
    selfTilingScore?: number;
  };
};

export function generatedTilesetId(document: GeneratedTilesetDocument): string {
  return document._id.toHexString();
}

export function sortPairFamilyIds(left: string, right: string): [string, string] {
  return left < right ? [left, right] : [right, left];
}

export function familyDisplayName(document: GeneratedTilesetDocument): string {
  const label = document.generation_metadata?.label?.trim();
  if (label) {
    return label;
  }
  return typeof document.name === 'string' ? document.name : generatedTilesetId(document);
}

function generatedAt(document: GeneratedTilesetDocument): number {
  const timestamp = document.generation_metadata?.generated_at ?? document.createdAt;
  return timestamp ? new Date(timestamp).getTime() : 0;
}

export async function listAcceptedFamilies(
  db: Db,
  projectId: string,
): Promise<GeneratedTilesetDocument[]> {
  const documents = await db.collection('tilesets').find({
    projectId,
    'generation_metadata.generated': true,
    'generation_metadata.role': 'family',
  }).toArray() as GeneratedTilesetDocument[];

  return documents.sort((left, right) => generatedAt(right) - generatedAt(left));
}

export function findTransitionForPair(
  documents: GeneratedTilesetDocument[],
  leftId: string,
  rightId: string,
): GeneratedTilesetDocument | undefined {
  const [first, second] = sortPairFamilyIds(leftId, rightId);
  return documents.find((document) => (
    document.generation_metadata?.role === 'transition'
    && document.generation_metadata.pairFamilyIds?.[0] === first
    && document.generation_metadata.pairFamilyIds[1] === second
  ));
}

export async function listGeneratedTilesets(
  db: Db,
  projectId: string,
): Promise<GeneratedTilesetDocument[]> {
  return db.collection('tilesets').find({
    projectId,
    'generation_metadata.generated': true,
  }).toArray() as Promise<GeneratedTilesetDocument[]>;
}

export async function loadReferenceImages(
  storage: TilesetStorage,
  families: GeneratedTilesetDocument[],
): Promise<GenerationReferenceImage[]> {
  return Promise.all(families.map(async (family) => {
    if (typeof family.storageLocation !== 'string' || !family.storageLocation) {
      throw new Error(`Family ${generatedTilesetId(family)} has no stored image`);
    }
    const file = await storage.downloadFile(family.storageLocation);
    return {
      tilesetId: generatedTilesetId(family),
      mimeType: 'image/png' as const,
      bytes: new Uint8Array(file.data),
    };
  }));
}
