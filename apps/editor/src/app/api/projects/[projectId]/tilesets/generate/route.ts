import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getTilesetStorage } from '@/lib/storage';
import { getGeminiClient, buildTilesetPrompt } from '@/lib/gemini';
import { auth } from '@/auth';
import type { TilesetGenerationRequest } from '@packages/types';

/**
 * POST /api/projects/[projectId]/tilesets/generate
 * 
 * Generate a tileset using Google Gemini API (Nano Banana)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { db } = await connectToDatabase();
    const { projectId } = await params;

    // Verify project exists and ownership
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    const projectUserId = project.userId instanceof ObjectId 
      ? project.userId.toHexString() 
      : project.userId;
    
    if (projectUserId && projectUserId !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body: TilesetGenerationRequest = await req.json();
    const { name, tile_width, tile_height, style, custom_prompt } = body;

    // Validation
    if (!name || !tile_width || !tile_height || !style) {
      return NextResponse.json(
        { message: 'Missing required fields: name, tile_width, tile_height, style' },
        { status: 400 }
      );
    }

    // Generate prompt
    const prompt = buildTilesetPrompt(style, tile_width, tile_height, custom_prompt);

    // Call Gemini API (Nano Banana)
    const gemini = getGeminiClient();
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        responseModalities: ['Image'],
        imageConfig: {
          aspectRatio: '1:1', // Square tileset
        },
      },
    });

    // Extract image from response (base64 inline data)
    let imageBuffer: Buffer | null = null;
    let imageBase64: string | null = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        imageBuffer = Buffer.from(imageBase64, 'base64');
        break;
      }
    }

    if (!imageBuffer || !imageBase64) {
      throw new Error('No image data returned from Gemini API');
    }

    // Return preview data WITHOUT saving to storage yet
    // The client will display this and send a separate request to save if approved
    return NextResponse.json({
      preview_data: `data:image/png;base64,${imageBase64}`,
      generation_params: {
        name,
        tile_width,
        tile_height,
        style,
        prompt,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating tileset:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
