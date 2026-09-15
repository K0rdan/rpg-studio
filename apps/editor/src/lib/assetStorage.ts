import { ObjectId, type Db, type Document, type WithId } from 'mongodb';
import type { AssetKind } from '@packages/types';
import { getTilesetById } from '@/config/tilesets';
import { assetImageUrl } from '@/lib/assetImageUrl';
import { getTilesetStorage } from '@/lib/storage';

const SPRITE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Canonical storage key of a sprite: users/{userId}/projects/{projectId}/sprites/{spriteId}.{ext}
 *
 * Deterministic on purpose — the key is rebuilt on read instead of trusted from the
 * sprite document, so a renamed or half-written record cannot point somewhere else.
 */
export function buildSpriteStorageKey(
  userId: string,
  projectId: string,
  spriteId: string,
  mimeType: string,
): string {
  const extension = SPRITE_EXTENSIONS[mimeType.toLowerCase()] ?? 'png';
  return `users/${userId}/projects/${projectId}/sprites/${spriteId}.${extension}`;
}

/**
 * Owner used in storage keys. Projects created before ownership was recorded have no
 * `userId`, so their assets live under the id of the user who uploaded them.
 */
export function projectOwnerId(project: WithId<Document>, fallbackUserId: string): string {
  const { userId } = project;
  if (typeof userId === 'string') {
    return userId;
  }
  return userId instanceof ObjectId ? userId.toHexString() : fallbackUserId;
}

/**
 * Image URL to hand to clients for an asset whose bytes live in storage, or an empty
 * string when storage cannot serve them. Callers pass the empty value straight through:
 * the editor turns it into an "asset unavailable" state instead of a broken image.
 */
export async function resolveAssetImageSource(
  projectId: string,
  kind: AssetKind,
  assetId: string,
  storageKey: string,
): Promise<string> {
  try {
    if (!await getTilesetStorage().fileExists(storageKey)) {
      console.warn(`[assets] No stored image for ${kind} ${assetId} (key: ${storageKey})`);
      return '';
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[assets] Storage unavailable for ${kind} ${assetId}: ${reason}`);
    return '';
  }

  return assetImageUrl(projectId, kind, assetId);
}

/**
 * Storage key holding the image of a project asset, or `null` when the asset has no
 * stored image — either it does not belong to the project, or it is a registry tileset
 * whose image is bundled with the app.
 */
export async function resolveAssetStorageKey(
  db: Db,
  project: WithId<Document>,
  sessionUserId: string,
  kind: AssetKind,
  assetId: string,
): Promise<string | null> {
  switch (kind) {
    case 'tileset': {
      if (getTilesetById(assetId) || !ObjectId.isValid(assetId)) {
        return null;
      }
      const tileset = await db.collection('tilesets').findOne({
        _id: new ObjectId(assetId),
        projectId: project._id.toHexString(),
      });
      return typeof tileset?.storageLocation === 'string' ? tileset.storageLocation : null;
    }
    case 'charset': {
      if (!ObjectId.isValid(assetId)) {
        return null;
      }
      const sprite = await db.collection('sprites').findOne({
        _id: new ObjectId(assetId),
        projectId: project._id.toHexString(),
      });
      if (!sprite) {
        return null;
      }
      return buildSpriteStorageKey(
        projectOwnerId(project, sessionUserId),
        project._id.toHexString(),
        assetId,
        sprite.mimeType ?? 'image/png',
      );
    }
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
