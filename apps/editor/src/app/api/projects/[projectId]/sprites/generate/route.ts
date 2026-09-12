import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import {
  CharsetStyle,
  CHARSET_GRID_COLUMNS,
  CHARSET_GRID_ROWS,
  isValidCharsetFrameDimension,
  type CharsetGenerationRequest,
} from '@packages/types';
import {
  buildCharsetPrompt,
  getClosestGeminiImageAspectRatio,
  getGeminiClient,
} from '@/lib/gemini';
import { requireProjectAccess } from '@/lib/apiAuth';

export const runtime = 'nodejs';

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

    const body: CharsetGenerationRequest = await req.json();
    const { name, frame_width, frame_height, style, custom_prompt } = body;

    if (
      !name?.trim()
      || !isValidCharsetFrameDimension(frame_width)
      || !isValidCharsetFrameDimension(frame_height)
      || !Object.values(CharsetStyle).includes(style)
      || (style === CharsetStyle.CUSTOM && !custom_prompt?.trim())
    ) {
      return NextResponse.json(
        { message: 'Invalid charset generation parameters' },
        { status: 400 },
      );
    }

    const prompt = buildCharsetPrompt(style, frame_width, frame_height, custom_prompt);
    const gemini = getGeminiClient();
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        responseModalities: ['Image'],
        imageConfig: {
          aspectRatio: getClosestGeminiImageAspectRatio(
            frame_width * CHARSET_GRID_COLUMNS,
            frame_height * CHARSET_GRID_ROWS,
          ),
        },
      },
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.find(
      (part) => Boolean(part.inlineData?.data),
    )?.inlineData;

    if (!inlineData?.data) {
      throw new Error('No image data returned from Gemini API');
    }

    const outputBuffer = await sharp(Buffer.from(inlineData.data, 'base64'))
      .resize(
        frame_width * CHARSET_GRID_COLUMNS,
        frame_height * CHARSET_GRID_ROWS,
        {
          fit: 'fill',
          kernel: sharp.kernel.nearest,
        },
      )
      .png()
      .toBuffer();

    return NextResponse.json({
      preview_data: `data:image/png;base64,${outputBuffer.toString('base64')}`,
      generation_params: {
        name: name.trim(),
        frame_width,
        frame_height,
        style,
        prompt,
      },
    });
  } catch (error) {
    console.error('Error generating charset:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
