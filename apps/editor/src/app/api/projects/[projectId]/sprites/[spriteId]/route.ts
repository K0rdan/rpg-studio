import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTilesetStorage } from '@/lib/storage';
import { ObjectId } from 'mongodb';
import { DEFAULT_CHARSET_ANIMATIONS } from '@packages/types';

/**
 * Builds the canonical Azure blob key for a sprite.
 * Mirrors the same function in the parent route — keeping it local avoids
 * a shared-module dependency for now.
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
// GET /api/projects/[projectId]/sprites/[spriteId]
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; spriteId: string }> }
) {
  try {
    const { projectId, spriteId } = await params;
    const { db } = await connectToDatabase();

    const sprite = await db.collection('sprites').findOne({ _id: new ObjectId(spriteId) });
    if (!sprite) {
      return NextResponse.json({ message: 'Sprite not found' }, { status: 404 });
    }

    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    const userId = typeof project?.userId === 'string' ? project.userId : project?.userId?.toHexString?.() ?? 'unknown';
    const mimeType = sprite.mimeType ?? 'image/png';

    // Reconstruct canonical key — sprites/ folder, not tilesets/
    const storageKey = buildSpriteStorageKey(userId, projectId, spriteId, mimeType);

    const storage = getTilesetStorage();
    let image_source = '';
    try {
      image_source = await storage.getTilesetImageUrl({ location: { storageKey } });
    } catch {
      console.warn(`[sprites/${spriteId}] URL generation failed (key: ${storageKey})`);
    }

    return NextResponse.json({
      id: sprite._id.toHexString(),
      name: sprite.name,
      image_source,
      frame_width: sprite.frame_width ?? 32,
      frame_height: sprite.frame_height ?? 64,
      animations: sprite.animations ?? DEFAULT_CHARSET_ANIMATIONS,
      storageKey,
      projectId,
      createdAt: sprite.createdAt,
    }, { status: 200 });
  } catch (error) {
    console.error('[sprite GET]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/projects/[projectId]/sprites/[spriteId]
// ---------------------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; spriteId: string }> }
) {
  try {
    const { projectId, spriteId } = await params;
    const { db } = await connectToDatabase();

    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    const sprite = await db.collection('sprites').findOne({ _id: new ObjectId(spriteId) });
    if (!sprite) {
      return NextResponse.json({ message: 'Sprite not found' }, { status: 404 });
    }

    const userId = typeof project.userId === 'string' ? project.userId : project.userId?.toHexString?.() ?? 'unknown';
    const mimeType = sprite.mimeType ?? 'image/png';

    // Reconstruct canonical key so we delete from sprites/ not tilesets/
    const storageKey = buildSpriteStorageKey(userId, projectId, spriteId, mimeType);

    // Delete blob from the correct sprites/ path (non-fatal if storage is offline)
    try {
      const storage = getTilesetStorage();
      await storage.deleteFile(storageKey);
    } catch (err) {
      console.warn(`[sprite DELETE] Could not delete blob for sprite "${spriteId}":`, err);
    }

    // Remove document and unregister from project
    await db.collection('sprites').deleteOne({ _id: new ObjectId(spriteId) });
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $pull: { sprites: spriteId } } as any
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[sprite DELETE]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
