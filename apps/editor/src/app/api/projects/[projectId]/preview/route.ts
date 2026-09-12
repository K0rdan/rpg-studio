import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireProjectAccess } from '@/lib/apiAuth';

import { getTilesetStorage } from '@/lib/storage';
import { TILESETS } from '@/config/tilesets';
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
  const { projectId } = await params;

  const access = await requireProjectAccess(projectId);
  if (!access.ok) {
    return access.response;
  }

  const { db } = await connectToDatabase();
  const { userId, project } = access;

  try {
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

    // Tileset documents only store an opaque `storageLocation`, so the image URL
    // has to be signed here. Without it the engine sees no usable image and falls
    // back to the bundled tileset, which renders the wrong tiles in the preview.
    const formattedTilesets = await Promise.all(
      tilesets.map(async (t) => {
        let image_source = '';
        try {
          image_source = await storage.getTilesetImageUrl({
            location: { storageKey: t.storageLocation },
          });
        } catch {
          console.warn(`[preview] Failed to generate URL for tileset ${t._id.toString()}`);
        }

        return {
          id: t._id.toString(),
          name: t.name,
          image_source,
          tile_width: t.tile_width,
          tile_height: t.tile_height,
          source_tile_width: t.source_tile_width,
          source_tile_height: t.source_tile_height,
        };
      })
    );

    // Return preview data
    return NextResponse.json({
      project: {
        id: project._id.toString(),
        name: project.name,
      },
      maps: formattedMaps,
      // Static tilesets are part of the registry, not the project: a map painted
      // with one of them must resolve the same image the editor painted with.
      tilesets: [...TILESETS, ...formattedTilesets],
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
