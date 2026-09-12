import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getTilesetStorage } from '@/lib/storage';
import { requireProjectAccess } from '@/lib/apiAuth';

/**
 * POST /api/projects/[projectId]/tilesets/save-generated
 * 
 * Save a previewed generated tileset to storage and database
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

    // Parse request body
    const body = await req.json();
    const { name, tile_width, tile_height, style, prompt, image_data } = body;

    // Validation
    if (!name || !tile_width || !tile_height || !style || !image_data) {
      return NextResponse.json(
        { message: 'Missing required fields: name, tile_width, tile_height, style, image_data' },
        { status: 400 }
      );
    }

    // Extract base64 data from data URL
    const base64Data = image_data.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Upload to storage
    const storage = getTilesetStorage();
    const tilesetId = new ObjectId();
    const storageLocation = await storage.uploadTilesetImage({
      userId,
      projectId,
      tilesetId: tilesetId.toHexString(),
      mimeType: 'image/png',
      data: imageBuffer,
    });

    // Save to database with generation metadata
    const tilesetsCollection = db.collection('tilesets');
    const tilesetDoc = {
      _id: tilesetId,
      projectId,
      name,
      tile_width,
      tile_height,
      storageLocation: storageLocation.storageKey,
      generation_metadata: {
        generated: true,
        style,
        prompt,
        generated_at: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await tilesetsCollection.insertOne(tilesetDoc);

    // Update project's tilesets array
    await db.collection<{ tilesets: string[] }>('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $push: { tilesets: tilesetId.toHexString() } }
    );

    // Generate signed URL
    const signedUrl = await storage.getTilesetImageUrl({ location: storageLocation });

    return NextResponse.json({
      id: tilesetId.toHexString(),
      name,
      image_source: signedUrl,
      tile_width,
      tile_height,
      projectId,
      generation_metadata: tilesetDoc.generation_metadata,
      createdAt: tilesetDoc.createdAt,
      updatedAt: tilesetDoc.updatedAt,
    }, { status: 201 });

  } catch (error) {
    console.error('Error saving generated tileset:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
