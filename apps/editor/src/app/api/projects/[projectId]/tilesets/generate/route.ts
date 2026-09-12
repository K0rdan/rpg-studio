import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getGeminiClient, buildTilesetPrompt } from '@/lib/gemini';
import { requireProjectAccess } from '@/lib/apiAuth';
import {
  COMMON_TILE_SIZES,
  TilesetStyle,
  type TilesetGenerationRequest,
} from '@packages/types';

export const runtime = 'nodejs';

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
    const { projectId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    // Parse request body
    const body: TilesetGenerationRequest = await req.json();
    const { name, tile_width, tile_height, style, custom_prompt } = body;

    // Validation
    const validTileSizes: readonly number[] = COMMON_TILE_SIZES;
    if (
      !name?.trim()
      || !validTileSizes.includes(tile_width)
      || !validTileSizes.includes(tile_height)
      || !Object.values(TilesetStyle).includes(style)
      || (style === TilesetStyle.CUSTOM && !custom_prompt?.trim())
    ) {
      return NextResponse.json(
        { message: 'Invalid tileset generation parameters' },
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
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          imageBase64 = part.inlineData.data || null;
          if (imageBase64) {
            imageBuffer = Buffer.from(imageBase64, 'base64');
          }
          break;
        }
      }
    }

    if (!imageBuffer || !imageBase64) {
      throw new Error('No image data returned from Gemini API');
    }

    const outputBuffer = await sharp(imageBuffer)
      .resize(tile_width * 8, tile_height * 8, {
        fit: 'fill',
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer();

    // Return preview data WITHOUT saving to storage yet
    // The client will display this and send a separate request to save if approved
    return NextResponse.json({
      preview_data: `data:image/png;base64,${outputBuffer.toString('base64')}`,
      generation_params: {
        name: name.trim(),
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
