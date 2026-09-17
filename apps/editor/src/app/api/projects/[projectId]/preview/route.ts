import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireProjectAccess } from '@/lib/apiAuth';

import {
  buildSpriteStorageKey,
  projectOwnerId,
  resolveAssetImageSource,
} from '@/lib/assetStorage';
import { TILESETS } from '@/config/tilesets';
import { DEFAULT_CHARSET_ANIMATIONS } from '@packages/types';
import {
  applyTilesetOverlays,
  loadTilesetOverlays,
  normalizeTilesetTiles,
} from '@/lib/tilesetTiles';

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
    const rawSprites = await db.collection('sprites').find({ projectId }).toArray();

    // Resolve sprite URLs
    const sprites = await Promise.all(
      rawSprites.map(async (s) => {
        const spriteId = s._id.toString();
        const mimeType = s.mimeType ?? 'image/png';
        const storageKey = buildSpriteStorageKey(
          projectOwnerId(project, userId),
          projectId,
          spriteId,
          mimeType,
        );

        return {
          id: spriteId,
          name: s.name,
          image_source: await resolveAssetImageSource(
            projectId,
            'charset',
            spriteId,
            storageKey,
          ),
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
      tilesetIds: Array.isArray(m.tilesetIds) && m.tilesetIds.length > 0
        ? m.tilesetIds
        : (m.tilesetId ? [m.tilesetId] : []),
      entities: m.entities || [], // Ensure entities array exists
    }));

    // Tileset documents only store an opaque `storageLocation`, so the image URL
    // has to be signed here. Without it the engine sees no usable image and falls
    // back to the bundled tileset, which renders the wrong tiles in the preview.
    const formattedTilesets = await Promise.all(
      tilesets.map(async (t) => {
        const tilesetId = t._id.toString();

        return {
          id: tilesetId,
          name: t.name,
          image_source: await resolveAssetImageSource(
            projectId,
            'tileset',
            tilesetId,
            t.storageLocation,
          ),
          tile_width: t.tile_width,
          tile_height: t.tile_height,
          source_tile_width: t.source_tile_width,
          source_tile_height: t.source_tile_height,
          tiles: normalizeTilesetTiles(t.tiles),
        };
      })
    );

    // Registry tilesets keep their collision marks in the per-project overlay
    const staticTilesets = applyTilesetOverlays(
      TILESETS,
      await loadTilesetOverlays(db, projectId)
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
      tilesets: [...staticTilesets, ...formattedTilesets],
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
