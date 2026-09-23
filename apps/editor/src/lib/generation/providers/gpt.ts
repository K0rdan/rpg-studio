import type {
  GenerationClientRequest,
  RawGenerationResult,
} from '@packages/types';

import {
  GenerationUnavailableError,
  type GenerationClient,
} from '../generationErrors';

const GPT_IMAGE_MODEL = 'gpt-image-1';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const MAX_REFERENCE_IMAGES = 16;

function apiKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

function baseUrl(): string {
  return (process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

function sheetSize(tileSize: GenerationClientRequest['tileSize']): string {
  const dimension = tileSize * 8;
  if (dimension <= 512) {
    return '512x512';
  }
  return '1024x1024';
}

interface OpenAiErrorBody {
  error?: {
    code?: string;
    type?: string;
    message?: string;
  };
}

function errorCode(body: OpenAiErrorBody): string | undefined {
  return body.error?.code ?? body.error?.type;
}

function mapHttpFailure(
  status: number,
  body: OpenAiErrorBody,
): GenerationUnavailableError {
  const code = errorCode(body);
  if (code === 'insufficient_quota') {
    return new GenerationUnavailableError(
      'gpt',
      'quota',
      'GPT image generation quota is exhausted',
    );
  }
  if (status === 429 || code === 'rate_limit_exceeded') {
    return new GenerationUnavailableError(
      'gpt',
      'rate_limit',
      'GPT image generation rate limit reached',
    );
  }
  return new GenerationUnavailableError(
    'gpt',
    'upstream',
    body.error?.message || 'GPT image generation failed',
  );
}

async function readJson(response: Response): Promise<OpenAiErrorBody & {
  data?: Array<{ b64_json?: string }>;
}> {
  try {
    return await response.json() as OpenAiErrorBody & {
      data?: Array<{ b64_json?: string }>;
    };
  } catch {
    return {};
  }
}

function decodePng(body: { data?: Array<{ b64_json?: string }> }): RawGenerationResult {
  const encoded = body.data?.[0]?.b64_json;
  if (!encoded) {
    throw new GenerationUnavailableError(
      'gpt',
      'upstream',
      'GPT did not return a PNG image',
    );
  }
  return {
    mimeType: 'image/png',
    bytes: new Uint8Array(Buffer.from(encoded, 'base64')),
    model: 'gpt',
  };
}

export class GptGenerationClient implements GenerationClient {
  readonly model = 'gpt' as const;

  isAvailable(): boolean {
    return Boolean(apiKey());
  }

  async generate(request: GenerationClientRequest): Promise<RawGenerationResult> {
    const key = apiKey();
    if (!key) {
      throw new GenerationUnavailableError(
        this.model,
        'misconfigured',
        'GPT image generation is not configured',
      );
    }
    if (request.referenceImages.length > MAX_REFERENCE_IMAGES) {
      throw new GenerationUnavailableError(
        this.model,
        'upstream',
        'GPT accepts at most 16 reference images',
      );
    }

    try {
      const response = request.referenceImages.length === 0
        ? await this.generateFromPrompt(request, key)
        : await this.editFromReferences(request, key);
      const body = await readJson(response);
      if (!response.ok) {
        throw mapHttpFailure(response.status, body);
      }
      return decodePng(body);
    } catch (error) {
      if (error instanceof GenerationUnavailableError) {
        throw error;
      }
      throw new GenerationUnavailableError(
        this.model,
        'upstream',
        'GPT image generation failed',
        { cause: error },
      );
    }
  }

  private generateFromPrompt(
    request: GenerationClientRequest,
    key: string,
  ): Promise<Response> {
    return fetch(`${baseUrl()}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GPT_IMAGE_MODEL,
        prompt: request.prompt,
        size: sheetSize(request.tileSize),
        output_format: 'png',
      }),
    });
  }

  private editFromReferences(
    request: GenerationClientRequest,
    key: string,
  ): Promise<Response> {
    const form = new FormData();
    form.set('model', GPT_IMAGE_MODEL);
    form.set('prompt', request.prompt);
    form.set('input_fidelity', 'high');
    for (const image of request.referenceImages) {
      form.append(
        'image[]',
        new Blob([image.bytes], { type: image.mimeType }),
        `${image.tilesetId}.png`,
      );
    }
    return fetch(`${baseUrl()}/images/edits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: form,
    });
  }
}
