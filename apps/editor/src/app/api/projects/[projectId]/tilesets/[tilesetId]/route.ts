import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getTilesetStorage } from '@/lib/storage';
import type { Tileset } from '@packages/types';
import { AssetNotFoundError } from '@packages/storage';

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
    const { db } = await connectToDatabase();
    const { projectId, tilesetId } = await params;

    // Verify project exists
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    // Fetch tileset from database
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

    const formattedTileset: Tileset & { projectId: string; createdAt: Date; updatedAt: Date } = {
      id: tileset._id.toHexString(),
      name: tileset.name,
      image_source: imageUrl,
      tile_width: tileset.tile_width,
      tile_height: tileset.tile_height,
      projectId: tileset.projectId,
      createdAt: tileset.createdAt,
      updatedAt: tileset.updatedAt,
    };

    return NextResponse.json(formattedTileset, { status: 200 });
  } catch (error) {
    console.error('Error fetching tileset:', error);
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
    const { db } = await connectToDatabase();
    const { projectId, tilesetId } = await params;

    // Verify project exists
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    // Fetch tileset from database
    const tilesetsCollection = db.collection('tilesets');
    const tileset = await tilesetsCollection.findOne({
      _id: new ObjectId(tilesetId),
      projectId,
    });

    if (!tileset) {
      return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
    }

    // Check if tileset is used by any maps
    const mapsCollection = db.collection('maps');
    const mapsUsingTileset = await mapsCollection
      .find({ tilesetId: tilesetId })
      .toArray();

    if (mapsUsingTileset.length > 0) {
      return NextResponse.json(
        {
          message: 'Tileset is currently in use by one or more maps',
          maps: mapsUsingTileset.map((map) => ({
            id: map._id.toHexString(),
            name: map.name,
          })),
        },
        { status: 400 }
      );
    }

    // Delete from storage
    const storage = getTilesetStorage();
    try {
      await storage.deleteTilesetAssets({
        projectId,
        tilesetId,
      });
    } catch (error) {
      console.error(`Failed to delete tileset from storage ${tilesetId}:`, error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await tilesetsCollection.deleteOne({ _id: new ObjectId(tilesetId) });

    // Remove from project's tilesets array
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $pull: { tilesets: tilesetId } }
    );

    return NextResponse.json({ message: 'Tileset deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting tileset:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}


