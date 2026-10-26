import { GoogleGenAI } from '@google/genai';

import {
  isRawGenerationImageMimeType,
  type GenerationClientRequest,
  type RawGenerationResult,
} from '@packages/types';

import {
  GenerationUnavailableError,
  type GenerationClient,
} from '../generationErrors';

const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-lite-image';

function upstreamStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined;
  }
  return typeof error.status === 'number' ? error.status : undefined;
}

export class GeminiGenerationClient implements GenerationClient {
  readonly model = 'gemini' as const;

  isAvailable(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  async generate(
    request: GenerationClientRequest,
  ): Promise<RawGenerationResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new GenerationUnavailableError(
        this.model,
        'misconfigured',
        'Gemini image generation is not configured',
      );
    }

    try {
      const client = new GoogleGenAI({ apiKey });
      const contents =
        request.referenceImages.length === 0
          ? request.prompt
          : [
              {
                role: 'user',
                parts: [
                  ...request.referenceImages.map((image) => ({
                    inlineData: {
                      mimeType: image.mimeType,
                      data: Buffer.from(image.bytes).toString('base64'),
                    },
                  })),
                  { text: request.prompt },
                ],
              },
            ];
      const response = await client.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents,
        config: {
          responseModalities: ['Image'],
          imageConfig: { aspectRatio: '1:1' },
        },
      });
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const inlineData = parts.find(
        (part) =>
          isRawGenerationImageMimeType(part.inlineData?.mimeType) &&
          Boolean(part.inlineData.data),
      )?.inlineData;

      if (
        !inlineData?.data
        || !isRawGenerationImageMimeType(inlineData.mimeType)
      ) {
        throw new GenerationUnavailableError(
          this.model,
          'upstream',
          'Gemini did not return a supported image',
          { cause: JSON.stringify(response) },
        );
      }

      return {
        mimeType: inlineData.mimeType,
        bytes: new Uint8Array(Buffer.from(inlineData.data, 'base64')),
        model: this.model,
      };
    } catch (error) {
      if (error instanceof GenerationUnavailableError) {
        throw error;
      }
      if (upstreamStatus(error) === 429) {
        throw new GenerationUnavailableError(
          this.model,
          'rate_limit',
          'Gemini rate limit reached',
          { cause: error },
        );
      }
      throw new GenerationUnavailableError(
        this.model,
        'upstream',
        'Gemini image generation failed',
        { cause: error },
      );
    }
  }
}
