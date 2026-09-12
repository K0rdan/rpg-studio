import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import sharp from 'sharp';
import {
  CharsetStyle,
  CHARSET_GRID_COLUMNS,
  CHARSET_GRID_ROWS,
  DEFAULT_CHARSET_ANIMATIONS,
  isValidCharsetFrameDimension,
} from '@packages/types';
import { requireProjectAccess } from '@/lib/apiAuth';
import { connectToDatabase } from '@/lib/mongodb';
import { getTilesetStorage } from '@/lib/storage';

const MAX_GENERATED_SPRITE_SIZE = 4 * 1024 * 1024;

interface SaveGeneratedCharsetRequest {
  name: string;
  frame_width: number;
  frame_height: number;
  style: CharsetStyle;
  prompt?: string;
  image_data: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const body: SaveGeneratedCharsetRequest = await req.json();
    const { name, frame_width, frame_height, style, prompt, image_data } = body;
    const imageMatch = image_data?.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);

    if (
      !name?.trim()
      || !isValidCharsetFrameDimension(frame_width)
      || !isValidCharsetFrameDimension(frame_height)
      || !Object.values(CharsetStyle).includes(style)
      || !imageMatch
    ) {
      return NextResponse.json(
        { message: 'Invalid generated charset data' },
        { status: 400 },
      );
    }

    const imageBuffer = Buffer.from(imageMatch[1], 'base64');
    if (imageBuffer.length > MAX_GENERATED_SPRITE_SIZE) {
      return NextResponse.json(
        { message: 'Generated charset exceeds the 4MB limit' },
        { status: 413 },
      );
    }
    const metadata = await sharp(imageBuffer).metadata();
    if (
      metadata.width !== frame_width * CHARSET_GRID_COLUMNS
      || metadata.height !== frame_height * CHARSET_GRID_ROWS
    ) {
      return NextResponse.json(
        {
          message: `Generated charset dimensions do not match its ${CHARSET_GRID_COLUMNS}×${CHARSET_GRID_ROWS} frame grid`,
        },
        { status: 400 },
      );
    }

    const { db } = await connectToDatabase();
    const spriteId = new ObjectId();
    const now = new Date().toISOString();
    const storageKey = `users/${access.userId}/projects/${projectId}/sprites/${spriteId.toHexString()}.png`;
    const storage = getTilesetStorage();

    await storage.uploadFile(storageKey, imageBuffer, 'image/png');

    const generationMetadata = {
      generated: true,
      style,
      prompt,
      generated_at: new Date(),
    };
    await db.collection('sprites').insertOne({
      _id: spriteId,
      name: name.trim(),
      projectId,
      userId: access.userId,
      mimeType: 'image/png',
      frame_width,
      frame_height,
      animations: DEFAULT_CHARSET_ANIMATIONS,
      storageKey,
      storageLocation: storageKey,
      generation_metadata: generationMetadata,
      createdAt: now,
    });

    await db.collection<{ sprites: string[] }>('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $push: { sprites: spriteId.toHexString() } },
    );

    const imageSource = await storage.getTilesetImageUrl({
      location: { storageKey },
    });

    return NextResponse.json({
      id: spriteId.toHexString(),
      name: name.trim(),
      image_source: imageSource,
      frame_width,
      frame_height,
      animations: DEFAULT_CHARSET_ANIMATIONS,
      storageKey,
      projectId,
      createdAt: now,
      generation_metadata: generationMetadata,
    }, { status: 201 });
  } catch (error) {
    console.error('Error saving generated charset:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
