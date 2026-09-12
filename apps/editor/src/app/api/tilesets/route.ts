import { NextRequest, NextResponse } from 'next/server';
import { TILESETS } from '@/config/tilesets';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getTilesetStorage } from '@/lib/storage';
import { requireApiSession, requireProjectAccess } from '@/lib/apiAuth';
import {
  applyTilesetOverlays,
  loadTilesetOverlays,
  normalizeTilesetTiles,
} from '@/lib/tilesetTiles';

/**
 * GET /api/tilesets?projectId=<projectId>
 * 
 * Returns available tilesets.
 * If projectId is provided, returns both static tilesets and project tilesets.
 * Otherwise, returns only static tilesets (for backward compatibility).
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    // Always include static tilesets, without collision marks until a project scopes them
    const staticTilesets = applyTilesetOverlays(TILESETS, new Map());

    if (!projectId) {
      const session = await requireApiSession();
      if (!session.ok) {
        return session.response;
      }

      return NextResponse.json(staticTilesets, { status: 200 });
    }

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const tilesetIds = access.project.tilesets || [];

    try {
      const { db } = await connectToDatabase();

      // Registry tilesets carry the collision marks this project saved for them
      const staticTilesetsForProject = applyTilesetOverlays(
        TILESETS,
        await loadTilesetOverlays(db, projectId)
      );

      if (tilesetIds.length === 0) {
        return NextResponse.json(staticTilesetsForProject, { status: 200 });
      }

      const projectTilesets = await db.collection('tilesets')
        .find({
          _id: { $in: tilesetIds.map((id: string) => new ObjectId(id)) },
          projectId,
        })
        .toArray();

      // Generate image URLs for project tilesets
      const storage = getTilesetStorage();
      const projectTilesetsWithUrls = await Promise.all(
        projectTilesets.map(async (tileset) => {
          try {
            const imageUrl = await storage.getTilesetImageUrl({
              location: { storageKey: tileset.storageLocation },
            });

            return {
              id: tileset._id.toHexString(),
              name: tileset.name,
              image_source: imageUrl,
              tile_width: tileset.tile_width,
              tile_height: tileset.tile_height,
              source_tile_width: tileset.source_tile_width,
              source_tile_height: tileset.source_tile_height,
              tiles: normalizeTilesetTiles(tileset.tiles),
            };
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            console.warn(`[tilesets] Storage unavailable for ${tileset._id.toHexString()}: ${reason}`);
            // Return tileset without image rather than silently dropping it
            return {
              id: tileset._id.toHexString(),
              name: tileset.name,
              image_source: null,
              tile_width: tileset.tile_width,
              tile_height: tileset.tile_height,
              source_tile_width: tileset.source_tile_width,
              source_tile_height: tileset.source_tile_height,
              tiles: normalizeTilesetTiles(tileset.tiles),
            };
          }
        })
      );

      return NextResponse.json(
        [...staticTilesetsForProject, ...projectTilesetsWithUrls],
        { status: 200 }
      );
    } catch (error) {
      console.error('Error fetching project tilesets:', error);
      // Fall through to return static tilesets only
    }

    // Return only static tilesets
    return NextResponse.json(staticTilesets, { status: 200 });
  } catch (error) {
    console.error('Error fetching tilesets:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
