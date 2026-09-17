import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId, type Db, type Document, type WithId } from 'mongodb';
import { getTilesetStorage } from '@/lib/storage';
import type { AssetUsageResponse, TileProperties, Tileset } from '@packages/types';
import { requireProjectAccess } from '@/lib/apiAuth';
import { getTilesetById } from '@/config/tilesets';
import { collectAssetUsages } from '@/lib/assetUsage';
import { resolveAssetImageSource } from '@/lib/assetStorage';
import {
  loadTilesetOverlay,
  normalizeTilesetTiles,
  saveTilesetOverlay,
  validateTilesetTiles,
  withTilesetTiles,
} from '@/lib/tilesetTiles';
import { normalizeAssetFolderPath } from '@/lib/assetFolders';

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

/**
 * Project tilesets keep their image in storage, so the response points at the asset
 * image proxy rather than at the storage host.
 */
async function formatProjectTileset(
  projectId: string,
  tileset: WithId<Document>,
): Promise<FormattedTileset> {
  const imageUrl = await resolveAssetImageSource(
    projectId,
    'tileset',
    tileset._id.toHexString(),
    tileset.storageLocation,
  );

  return {
    id: tileset._id.toHexString(),
    name: tileset.name,
    folderPath: tileset.folderPath,
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

    return NextResponse.json(
      await formatProjectTileset(projectId, tileset),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching tileset:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[projectId]/tilesets/[tilesetId]
 *
 * Update a tileset's collision marks (`tiles`), name, or asset folder.
 * Registry tilesets only accept `tiles`, which go to the per-project overlay.
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

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid update payload' }, { status: 400 });
    }
    const update = body as { tiles?: unknown; name?: unknown; folderPath?: unknown };
    const hasTiles = Object.prototype.hasOwnProperty.call(update, 'tiles');
    const hasName = Object.prototype.hasOwnProperty.call(update, 'name');
    const hasFolderPath = Object.prototype.hasOwnProperty.call(update, 'folderPath');
    if (!hasTiles && !hasName && !hasFolderPath) {
      return NextResponse.json({ message: 'No supported fields to update' }, { status: 400 });
    }

    const tilesPayload = hasTiles ? validateTilesetTiles(update.tiles) : null;
    if (tilesPayload && !tilesPayload.ok) {
      return NextResponse.json({ message: tilesPayload.message }, { status: 400 });
    }
    const name = hasName && typeof update.name === 'string' ? update.name.trim() : null;
    if (hasName && !name) {
      return NextResponse.json({ message: 'Asset name cannot be empty' }, { status: 400 });
    }
    const folderPath = hasFolderPath ? normalizeAssetFolderPath(update.folderPath) : undefined;
    if (hasFolderPath && folderPath === null) {
      return NextResponse.json({ message: 'Invalid asset folder path' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Registry tilesets are read-only assets, so their marks go to the project overlay
    const staticTileset = getTilesetById(tilesetId);
    if (staticTileset) {
      if (hasName || hasFolderPath || !tilesPayload?.ok) {
        return NextResponse.json(
          { message: 'Built-in tileset metadata cannot be changed' },
          { status: 403 },
        );
      }
      const tiles = await saveTilesetOverlay(db, projectId, tilesetId, tilesPayload.tiles);

      return NextResponse.json(
        await formatStaticTileset(db, projectId, staticTileset, tiles),
        { status: 200 }
      );
    }

    if (!OBJECT_ID_PATTERN.test(tilesetId)) {
      return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
    }

    const fields: Document = { updatedAt: new Date() };
    if (tilesPayload?.ok) fields.tiles = tilesPayload.tiles;
    if (name) fields.name = name;
    if (folderPath !== undefined) fields.folderPath = folderPath;

    const tileset = await db.collection('tilesets').findOneAndUpdate(
      { _id: new ObjectId(tilesetId), projectId },
      { $set: fields },
      { returnDocument: 'after' }
    );

    if (!tileset) {
      return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
    }

    return NextResponse.json(
      await formatProjectTileset(projectId, tileset),
      { status: 200 }
    );
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



