import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTilesetStorage } from '@/lib/storage';
import { ObjectId } from 'mongodb';
import type { Sprite } from '@packages/types';
import { DEFAULT_CHARSET_ANIMATIONS } from '@packages/types';

const MAX_SPRITE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

/**
 * Builds the canonical Azure blob key for a sprite.
 * Always: users/{userId}/projects/{projectId}/sprites/{spriteId}.{ext}
 *
 * This is deterministic — we never need to store it separately,
 * but we keep it in storageLocation for debuggability and migration safety.
 */
function buildSpriteStorageKey(userId: string, projectId: string, spriteId: string, mimeType: string): string {
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
  };
  const ext = extMap[mimeType.toLowerCase()] ?? 'png';
  return `users/${userId}/projects/${projectId}/sprites/${spriteId}.${ext}`;
}

// ---------------------------------------------------------------------------
// GET /api/projects/[projectId]/sprites
// Returns all sprites in the project with pre-signed image URLs.
// The storageKey is always reconstructed deterministically — we fall back to
// the stored storageLocation only for records that pre-date this change.
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { db } = await connectToDatabase();

    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    const spriteIds = (project.sprites || []).map((id: string) => new ObjectId(id));
    if (spriteIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const storage = getTilesetStorage();
    const rawSprites = await db.collection('sprites').find({ _id: { $in: spriteIds } }).toArray();
    const userId = typeof project.userId === 'string' ? project.userId : project.userId?.toHexString?.() ?? 'unknown';

    const sprites: Sprite[] = await Promise.all(
      rawSprites.map(async (s) => {
        const spriteId = s._id.toHexString();
        const mimeType = s.mimeType ?? 'image/png';

        // Prefer the canonical sprites/ key; fall back to legacy storageLocation for old records
        const canonicalKey = buildSpriteStorageKey(userId, projectId, spriteId, mimeType);
        const storageKey = canonicalKey;

        let image_source = '';
        try {
          image_source = await storage.getTilesetImageUrl({ location: { storageKey } });
        } catch {
          console.warn(`[sprites] Failed to generate URL for sprite ${spriteId} (key: ${storageKey})`);
        }

        return {
          id: spriteId,
          name: s.name,
          image_source,
          frame_width: s.frame_width ?? 32,
          frame_height: s.frame_height ?? 64,
          animations: s.animations ?? DEFAULT_CHARSET_ANIMATIONS,
          storageKey,
          projectId,
          createdAt: s.createdAt,
        } satisfies Sprite;
      })
    );

    return NextResponse.json(sprites, { status: 200 });
  } catch (error) {
    console.error('[sprites GET]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/projects/[projectId]/sprites
// Uploads a spritesheet image and creates a Sprite document.
// ---------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { db } = await connectToDatabase();

    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const frameWidthRaw = formData.get('frame_width');
    const frameHeightRaw = formData.get('frame_height');
    const animationsRaw = formData.get('animations') as string | null;

    if (!file) return NextResponse.json({ message: 'file is required' }, { status: 400 });
    if (!name) return NextResponse.json({ message: 'name is required' }, { status: 400 });
    if (file.size > MAX_SPRITE_SIZE_BYTES) {
      return NextResponse.json({ message: 'File too large (max 4MB)' }, { status: 400 });
    }

    const frame_width = frameWidthRaw ? parseInt(String(frameWidthRaw)) : 32;
    const frame_height = frameHeightRaw ? parseInt(String(frameHeightRaw)) : 64;
    let animations: Record<string, number[]> = DEFAULT_CHARSET_ANIMATIONS;
    if (animationsRaw) {
      try { animations = JSON.parse(animationsRaw); }
      catch { return NextResponse.json({ message: 'animations must be valid JSON' }, { status: 400 }); }
    }

    const userId = typeof project.userId === 'string' ? project.userId : project.userId?.toHexString?.() ?? 'unknown';
    const mimeType = file.type || 'image/png';
    const now = new Date().toISOString();

    // Insert the document first to get the spriteId used in the storage key
    const doc = { name, projectId, userId, mimeType, frame_width, frame_height, animations, createdAt: now };
    const result = await db.collection('sprites').insertOne(doc);
    const spriteId = result.insertedId.toHexString();

    // Build canonical storage key — sprites/ folder, not tilesets/
    const storageKey = buildSpriteStorageKey(userId, projectId, spriteId, mimeType);

    // Upload using the generic uploadFile() so the folder is sprites/ not tilesets/
    const storage = getTilesetStorage();
    const buffer = Buffer.from(await file.arrayBuffer());
    await storage.uploadFile(storageKey, buffer, mimeType);

    // Register sprite on the project
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $push: { sprites: spriteId } } as any
    );

    // Pre-sign the URL for the immediate response
    let image_source = '';
    try {
      image_source = await storage.getTilesetImageUrl({ location: { storageKey } });
    } catch {
      console.warn('[sprites POST] Could not generate image URL immediately after upload');
    }

    const responseSprite: Sprite = {
      id: spriteId,
      name,
      image_source,
      frame_width,
      frame_height,
      animations,
      storageKey,
      projectId,
      createdAt: now,
    };

    return NextResponse.json(responseSprite, { status: 201 });
  } catch (error) {
    console.error('[sprites POST]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
