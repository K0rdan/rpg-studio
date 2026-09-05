import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

import { getTilesetStorage } from '@/lib/storage';
import { DEFAULT_CHARSET_ANIMATIONS } from '@packages/types';

function buildSpriteStorageKey(userId: string, projectId: string, spriteId: string, mimeType: string): string {
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const extension = extMap[mimeType] || 'png';
  return `users/${userId}/projects/${projectId}/sprites/${spriteId}.${extension}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const { db } = await connectToDatabase();
  const userId = session.user.id;

  try {
    // Fetch project
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
      userId,
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch all maps (entities are embedded in maps)
    const maps = await db.collection('maps').find({
      _id: { $in: (project.maps || []).map((id: string) => new ObjectId(id)) }
    }).toArray();

    // Fetch all tilesets
    const tilesets = await db.collection('tilesets').find({
      _id: { $in: (project.tilesets || []).map((id: string) => new ObjectId(id)) }
    }).toArray();

    // Fetch all sprites
    const storage = getTilesetStorage();
    const rawSprites = await db.collection('sprites').find({ projectId }).toArray();
    
    // Resolve sprite URLs
    const sprites = await Promise.all(
      rawSprites.map(async (s) => {
        const spriteId = s._id.toString();
        const mimeType = s.mimeType ?? 'image/png';
        const storageKey = buildSpriteStorageKey(userId, projectId, spriteId, mimeType);

        let image_source = '';
        try {
          image_source = await storage.getTilesetImageUrl({ location: { storageKey } });
        } catch {
          console.warn(`[preview] Failed to generate URL for sprite ${spriteId}`);
        }

        return {
          id: spriteId,
          name: s.name,
          image_source,
          frame_width: s.frame_width ?? 32,
          frame_height: s.frame_height ?? 64,
          animations: s.animations ?? DEFAULT_CHARSET_ANIMATIONS,
        };
      })
    );

    // Convert ObjectIds to strings for JSON serialization
    const formattedMaps = maps.map(m => ({
      ...m,
      id: m._id.toString(),
      _id: undefined,
      tilesetId: m.tilesetId,
      entities: m.entities || [], // Ensure entities array exists
    }));

    const formattedTilesets = tilesets.map(t => ({
      ...t,
      id: t._id.toString(),
      _id: undefined,
    }));

    // Return preview data
    return NextResponse.json({
      project: {
        id: project._id.toString(),
        name: project.name,
      },
      maps: formattedMaps,
      tilesets: formattedTilesets,
      sprites,
    });
  } catch (error) {
    console.error('Preview API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preview data' },
      { status: 500 }
    );
  }
}
