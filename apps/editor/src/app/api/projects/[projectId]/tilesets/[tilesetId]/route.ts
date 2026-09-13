import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId, type Db, type Document, type WithId } from 'mongodb';
import { getTilesetStorage } from '@/lib/storage';
import type { AssetUsageResponse, TileProperties, Tileset } from '@packages/types';
import { AssetNotFoundError } from '@packages/storage';
import { requireProjectAccess } from '@/lib/apiAuth';
import { getTilesetById } from '@/config/tilesets';
import { collectAssetUsages } from '@/lib/assetUsage';
import {
  loadTilesetOverlay,
  normalizeTilesetTiles,
  saveTilesetOverlay,
  validateTilesetTiles,
  withTilesetTiles,
} from '@/lib/tilesetTiles';

type FormattedTileset = Tileset & { projectId: string; createdAt: Date; updatedAt: Date };

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

/**
 * Registry tilesets have no document to write to, so their collision marks come from the
 * per-project overlay instead.
 */
async function formatStaticTileset(
  db: Db,
  projectId: string,
  staticTileset: Tileset,
  tiles?: TileProperties[],
): Promise<FormattedTileset> {
  const overlay = tiles ?? (await loadTilesetOverlay(db, projectId, staticTileset.id));

  return {
    ...withTilesetTiles(staticTileset, overlay),
    projectId,
    createdAt: new Date(), // Static tilesets don't have timestamps
    updatedAt: new Date(),
  };
}

function formatProjectTileset(
  tileset: WithId<Document>,
  imageUrl: string
): FormattedTileset {
  return {
    id: tileset._id.toHexString(),
    name: tileset.name,
    image_source: imageUrl,
    tile_width: tileset.tile_width,
    tile_height: tileset.tile_height,
    source_tile_width: tileset.source_tile_width,
    source_tile_height: tileset.source_tile_height,
    tiles: normalizeTilesetTiles(tileset.tiles),
    projectId: tileset.projectId,
    createdAt: tileset.createdAt,
    updatedAt: tileset.updatedAt,
  };
}

/**
 * GET /api/projects/[projectId]/tilesets/[tilesetId]
 * 
 * Get a tileset by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; tilesetId: string }> }
) {
  try {
    const { projectId, tilesetId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();

    // Check if this is a static tileset from config
    const staticTileset = getTilesetById(tilesetId);

    if (staticTileset) {
      // Return static tileset (only the collision overlay needs a database read)
      return NextResponse.json(
        await formatStaticTileset(db, projectId, staticTileset),
        { status: 200 }
      );
    }

    // Not a static tileset, try to fetch from database
    // Only try ObjectId conversion if it looks like a valid ObjectId (24 hex chars)
    if (!OBJECT_ID_PATTERN.test(tilesetId)) {
      return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
    }

    const tilesetsCollection = db.collection('tilesets');
    const tileset = await tilesetsCollection.findOne({
      _id: new ObjectId(tilesetId),
      projectId,
    });

    if (!tileset) {
      return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
    }

    // Generate image URL
    const storage = getTilesetStorage();
    let imageUrl = '';
    try {
      imageUrl = await storage.getTilesetImageUrl({
        location: { storageKey: tileset.storageLocation },
      });
    } catch (error) {
      console.error(`Failed to generate URL for tileset ${tilesetId}:`, error);
      if (error instanceof AssetNotFoundError) {
        return NextResponse.json(
          { message: 'Tileset image not found in storage' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(formatProjectTileset(tileset, imageUrl), { status: 200 });
  } catch (error) {
    console.error('Error fetching tileset:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[projectId]/tilesets/[tilesetId]
 *
 * Replace the collision marks (`tiles`) of a tileset
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; tilesetId: string }> }
) {
  try {
    const { projectId, tilesetId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const payload = validateTilesetTiles((body as { tiles?: unknown } | null)?.tiles);
    if (!payload.ok) {
      return NextResponse.json({ message: payload.message }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Registry tilesets are read-only assets, so their marks go to the project overlay
    const staticTileset = getTilesetById(tilesetId);
    if (staticTileset) {
      const tiles = await saveTilesetOverlay(db, projectId, tilesetId, payload.tiles);

      return NextResponse.json(
        await formatStaticTileset(db, projectId, staticTileset, tiles),
        { status: 200 }
      );
    }

    if (!OBJECT_ID_PATTERN.test(tilesetId)) {
      return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
    }

    const tileset = await db.collection('tilesets').findOneAndUpdate(
      { _id: new ObjectId(tilesetId), projectId },
      { $set: { tiles: payload.tiles, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!tileset) {
      return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
    }

    // A failed URL signature must not hide a successful write
    let imageUrl = '';
    try {
      imageUrl = await getTilesetStorage().getTilesetImageUrl({
        location: { storageKey: tileset.storageLocation },
      });
    } catch (error) {
      console.error(`Failed to generate URL for tileset ${tilesetId}:`, error);
    }

    return NextResponse.json(formatProjectTileset(tileset, imageUrl), { status: 200 });
  } catch (error) {
    console.error('Error updating tileset tiles:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[projectId]/tilesets/[tilesetId]
 * 
 * Delete a tileset
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; tilesetId: string }> }
) {
  try {
    const { projectId, tilesetId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    if (getTilesetById(tilesetId)) {
      return NextResponse.json(
        { message: 'Built-in tilesets cannot be deleted' },
        { status: 403 },
      );
    }

    if (!OBJECT_ID_PATTERN.test(tilesetId)) {
      return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
    }

    const { db } = await connectToDatabase();
    const { project } = access;

    // Fetch tileset from database
    const tilesetsCollection = db.collection('tilesets');
    const tileset = await tilesetsCollection.findOne({
      _id: new ObjectId(tilesetId),  // Tilesets use _id as ObjectId
      projectId,
    });

    if (!tileset) {
      return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
    }

    const usages = await collectAssetUsages(
      db,
      {
        maps: Array.isArray(project.maps) ? project.maps : [],
        characters: [],
      },
      'tileset',
      tilesetId,
    );
    if (usages.length > 0) {
      const usageResponse: AssetUsageResponse = {
        kind: 'tileset',
        id: tilesetId,
        origin: 'project',
        usages,
      };
      return NextResponse.json(
        {
          message: 'Tileset is currently in use by one or more maps',
          ...usageResponse,
        },
        { status: 409 },
      );
    }

    // Delete from storage
    const storage = getTilesetStorage();
    try {
      await storage.deleteTilesetAssets({
        userId: String(project.userId ?? ''),
        projectId,
        tilesetId,
      });
    } catch (error) {
      console.error(`Failed to delete tileset from storage ${tilesetId}:`, error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await tilesetsCollection.deleteOne({ _id: new ObjectId(tilesetId) });  // Use ObjectId

    // Remove from project's tilesets array
    await db.collection<{ tilesets: string[] }>('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $pull: { tilesets: tilesetId } }
    );

    return NextResponse.json({ message: 'Tileset deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting tileset:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}



