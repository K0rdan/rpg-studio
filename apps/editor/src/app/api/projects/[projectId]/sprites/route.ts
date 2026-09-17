import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getTilesetStorage } from '@/lib/storage';
import { ObjectId } from 'mongodb';
import sharp from 'sharp';
import type { Sprite } from '@packages/types';
import {
  CHARSET_GRID_COLUMNS,
  CHARSET_GRID_ROWS,
  DEFAULT_CHARSET_ANIMATIONS,
  DEFAULT_CHARSET_FRAME_SIZE,
  isValidCharsetFrameDimension,
} from '@packages/types';
import { requireProjectAccess } from '@/lib/apiAuth';
import { assetImageUrl } from '@/lib/assetImageUrl';
import {
  buildSpriteStorageKey,
  projectOwnerId,
  resolveAssetImageSource,
} from '@/lib/assetStorage';
import { normalizeAssetFolderPath } from '@/lib/assetFolders';

const MAX_SPRITE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

// ---------------------------------------------------------------------------
// GET /api/projects/[projectId]/sprites
// Returns all sprites in the project, with their image served by the editor.
// The storageKey is always reconstructed deterministically from the sprite id.
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();
    const { project } = access;

    const spriteIds = (project.sprites || []).map((id: string) => new ObjectId(id));
    if (spriteIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const rawSprites = await db.collection('sprites').find({ _id: { $in: spriteIds } }).toArray();
    const userId = projectOwnerId(project, access.userId);

    const sprites: Sprite[] = await Promise.all(
      rawSprites.map(async (s) => {
        const spriteId = s._id.toHexString();
        const mimeType = s.mimeType ?? 'image/png';
        const storageKey = buildSpriteStorageKey(userId, projectId, spriteId, mimeType);

        return {
          id: spriteId,
          name: s.name,
          folderPath: s.folderPath,
          image_source: await resolveAssetImageSource(
            projectId,
            'charset',
            spriteId,
            storageKey,
          ),
          frame_width: s.frame_width ?? 32,
          frame_height: s.frame_height ?? 64,
          animations: s.animations ?? DEFAULT_CHARSET_ANIMATIONS,
          storageKey,
          projectId,
          createdAt: s.createdAt,
          generation_metadata: s.generation_metadata,
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

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();
    const { project } = access;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const frameWidthRaw = formData.get('frame_width');
    const frameHeightRaw = formData.get('frame_height');
    const animationsRaw = formData.get('animations') as string | null;
    const folderPath = normalizeAssetFolderPath(formData.get('folderPath'));

    if (!file) return NextResponse.json({ message: 'file is required' }, { status: 400 });
    if (!name) return NextResponse.json({ message: 'name is required' }, { status: 400 });
    if (folderPath === null) {
      return NextResponse.json({ message: 'Invalid asset folder path' }, { status: 400 });
    }
    if (file.size > MAX_SPRITE_SIZE_BYTES) {
      return NextResponse.json({ message: 'File too large (max 4MB)' }, { status: 400 });
    }

    const frame_width = frameWidthRaw
      ? Number(frameWidthRaw)
      : DEFAULT_CHARSET_FRAME_SIZE.width;
    const frame_height = frameHeightRaw
      ? Number(frameHeightRaw)
      : DEFAULT_CHARSET_FRAME_SIZE.height;
    if (
      !isValidCharsetFrameDimension(frame_width)
      || !isValidCharsetFrameDimension(frame_height)
    ) {
      return NextResponse.json(
        { message: 'Frame width and height must be positive integers within the supported range' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageMetadata = await sharp(buffer).metadata();
    if (
      imageMetadata.width !== frame_width * CHARSET_GRID_COLUMNS
      || imageMetadata.height !== frame_height * CHARSET_GRID_ROWS
    ) {
      return NextResponse.json(
        {
          message: `Image dimensions must match a ${CHARSET_GRID_COLUMNS}×${CHARSET_GRID_ROWS} grid of the configured frame size`,
        },
        { status: 400 },
      );
    }

    let animations: Record<string, number[]> = DEFAULT_CHARSET_ANIMATIONS;
    if (animationsRaw) {
      try { animations = JSON.parse(animationsRaw); }
      catch { return NextResponse.json({ message: 'animations must be valid JSON' }, { status: 400 }); }
    }

    const userId = projectOwnerId(project, access.userId);
    const mimeType = file.type || 'image/png';
    const now = new Date().toISOString();

    // Insert the document first to get the spriteId used in the storage key
    const doc = {
      name,
      ...(folderPath ? { folderPath } : {}),
      projectId,
      userId,
      mimeType,
      frame_width,
      frame_height,
      animations,
      createdAt: now,
    };
    const result = await db.collection('sprites').insertOne(doc);
    const spriteId = result.insertedId.toHexString();

    // Build canonical storage key — sprites/ folder, not tilesets/
    const storageKey = buildSpriteStorageKey(userId, projectId, spriteId, mimeType);

    // Upload using the generic uploadFile() so the folder is sprites/ not tilesets/
    const storage = getTilesetStorage();
    await storage.uploadFile(storageKey, buffer, mimeType);

    // Register sprite on the project
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $push: { sprites: spriteId } } as any
    );

    const responseSprite: Sprite = {
      id: spriteId,
      name,
      ...(folderPath ? { folderPath } : {}),
      image_source: assetImageUrl(projectId, 'charset', spriteId),
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
