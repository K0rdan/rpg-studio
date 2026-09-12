import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getTilesetStorage } from '@/lib/storage';
import type { Tileset } from '@packages/types';
import { SUPPORTED_MIME_TYPES } from '@packages/storage';
import { InvalidMimeTypeError, UploadFailedError } from '@packages/storage';
import { requireProjectAccess } from '@/lib/apiAuth';
import { normalizeTilesetTiles } from '@/lib/tilesetTiles';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * GET /api/projects/[projectId]/tilesets
 * 
 * List all tilesets for a project
 */
export async function GET(
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

    // Get tileset IDs from project
    const tilesetIds = access.project.tilesets || [];

    if (tilesetIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Fetch tilesets from database
    const tilesetsCollection = db.collection('tilesets');
    const tilesets = await tilesetsCollection
      .find({
        _id: { $in: tilesetIds.map((id: string) => new ObjectId(id)) },
        projectId,
      })
      .toArray();

    // Generate image URLs for each tileset
    const storage = getTilesetStorage();
    const tilesetsWithUrls = await Promise.all(
      tilesets.map(async (tileset) => {
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
            projectId: tileset.projectId,
            createdAt: tileset.createdAt,
            updatedAt: tileset.updatedAt,
          };
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          console.warn(`[tilesets/${projectId}] Storage unavailable for ${tileset._id.toHexString()}: ${reason}`);
          // Return tileset without URL if storage fails
          return {
            id: tileset._id.toHexString(),
            name: tileset.name,
            image_source: '', // Empty URL indicates error
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
      })
    );

    return NextResponse.json(tilesetsWithUrls, { status: 200 });
  } catch (error) {
    console.error('Error fetching tilesets:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[projectId]/tilesets
 * 
 * Upload a tileset image file
 * Note: This endpoint handles the file upload via multipart/form-data
 */
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
    const { userId } = access;

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const tile_width = formData.get('tile_width');
    const tile_height = formData.get('tile_height');

    // Validate required fields
    if (!file || !name || !tile_width || !tile_height) {
      return NextResponse.json(
        { message: 'Missing required fields: file, name, tile_width, tile_height' },
        { status: 400 }
      );
    }

    // Validate file
    const fileSize = file.size;
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    const mimeType = file.type;
    const supportedMimeTypes: readonly string[] = SUPPORTED_MIME_TYPES;
    if (!supportedMimeTypes.includes(mimeType)) {
      return NextResponse.json(
        {
          message: `Unsupported file format. Supported formats: ${SUPPORTED_MIME_TYPES.join(', ')}`,
          code: 'INVALID_MIME_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate tile dimensions
    const tileWidth = parseInt(tile_width as string, 10);
    const tileHeight = parseInt(tile_height as string, 10);
    if (isNaN(tileWidth) || isNaN(tileHeight) || tileWidth < 1 || tileHeight < 1) {
      return NextResponse.json(
        { message: 'tile_width and tile_height must be positive integers' },
        { status: 400 }
      );
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage
    const storage = getTilesetStorage();
    let storageLocation;
    const storageTilesetId = new ObjectId().toHexString();
    try {
      storageLocation = await storage.uploadTilesetImage({
        userId,
        projectId,
        tilesetId: storageTilesetId,
        mimeType,
        data: buffer,
      });
    } catch (error) {
      if (error instanceof InvalidMimeTypeError || error instanceof UploadFailedError) {
        return NextResponse.json(
          { message: error.message, code: error.code },
          { status: 400 }
        );
      }
      throw error;
    }

    const tilesetId = new ObjectId();

    // Save tileset metadata to database
    const tilesetsCollection = db.collection('tilesets');
    const tilesetDoc = {
      _id: tilesetId,
      projectId,
      name,
      tile_width: tileWidth,
      tile_height: tileHeight,
      storageLocation: storageLocation.storageKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await tilesetsCollection.insertOne(tilesetDoc);

    // Update project's tilesets array
    await db.collection<{ tilesets: string[] }>('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $push: { tilesets: tilesetId.toHexString() } }
    );

    // Generate image URL
    const imageUrl = await storage.getTilesetImageUrl({ location: storageLocation });

    const tileset: Tileset & { projectId: string; createdAt: Date; updatedAt: Date } = {
      id: tilesetId.toHexString(),
      name,
      image_source: imageUrl,
      tile_width: tileWidth,
      tile_height: tileHeight,
      projectId,
      createdAt: tilesetDoc.createdAt,
      updatedAt: tilesetDoc.updatedAt,
    };

    return NextResponse.json(tileset, { status: 201 });
  } catch (error) {
    console.error('Error uploading tileset:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}



