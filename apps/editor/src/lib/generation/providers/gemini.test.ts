import { GoogleGenAI } from '@google/genai';

import { GenerationUnavailableError } from '../generationClient';
import { GeminiGenerationClient } from './gemini';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
}));

const mockedGoogleGenAI = GoogleGenAI as unknown as jest.Mock;

describe('GeminiGenerationClient', () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const generateContent = jest.fn();

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    generateContent.mockReset();
    mockedGoogleGenAI.mockReset();
    mockedGoogleGenAI.mockImplementation(() => ({
      models: { generateContent },
    }));
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it('reports availability from the API key and maps a missing key', async () => {
    const client = new GeminiGenerationClient();
    expect(client.isAvailable()).toBe(true);

    delete process.env.GEMINI_API_KEY;
    expect(client.isAvailable()).toBe(false);
    await expect(client.generate({
      model: 'gemini',
      prompt: 'structured prompt',
      referenceImages: [],
      tileSize: 32,
    })).rejects.toMatchObject({
      model: 'gemini',
      reason: 'misconfigured',
    });
  });

  it('sends a text-only first-family request and extracts PNG bytes', async () => {
    generateContent.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              mimeType: 'image/png',
              data: Buffer.from('png bytes').toString('base64'),
            },
          }],
        },
      }],
    });

    const result = await new GeminiGenerationClient().generate({
      model: 'gemini',
      prompt: 'structured prompt',
      referenceImages: [],
      tileSize: 32,
    });

    expect(generateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash-image',
      contents: 'structured prompt',
      config: {
        responseModalities: ['Image'],
        imageConfig: { aspectRatio: '1:1' },
      },
    });
    expect(result).toEqual({
      mimeType: 'image/png',
      bytes: new Uint8Array(Buffer.from('png bytes')),
      model: 'gemini',
    });
  });

  it('maps malformed responses and upstream failures', async () => {
    generateContent.mockResolvedValueOnce({ candidates: [] });
    await expect(new GeminiGenerationClient().generate({
      model: 'gemini',
      prompt: 'structured prompt',
      referenceImages: [],
      tileSize: 32,
    })).rejects.toBeInstanceOf(GenerationUnavailableError);

    generateContent.mockRejectedValueOnce(Object.assign(new Error('exhausted'), { status: 429 }));
    await expect(new GeminiGenerationClient().generate({
      model: 'gemini',
      prompt: 'structured prompt',
      referenceImages: [],
      tileSize: 32,
    })).rejects.toMatchObject({ reason: 'rate_limit' });

    generateContent.mockRejectedValueOnce(new Error('provider failed'));
    await expect(new GeminiGenerationClient().generate({
      model: 'gemini',
      prompt: 'structured prompt',
      referenceImages: [],
      tileSize: 32,
    })).rejects.toMatchObject({ reason: 'upstream' });
  });

  it('sends each reference as inlineData before the prompt text', async () => {
    generateContent.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              mimeType: 'image/png',
              data: Buffer.from('png bytes').toString('base64'),
            },
          }],
        },
      }],
    });

    const first = new Uint8Array([1, 2, 3]);
    const second = new Uint8Array([4, 5, 6]);
    await new GeminiGenerationClient().generate({
      model: 'gemini',
      prompt: 'match attached families',
      referenceImages: [
        { tilesetId: 'a', mimeType: 'image/png', bytes: first },
        { tilesetId: 'b', mimeType: 'image/png', bytes: second },
      ],
      tileSize: 32,
    });

    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: Buffer.from(first).toString('base64') } },
          { inlineData: { mimeType: 'image/png', data: Buffer.from(second).toString('base64') } },
          { text: 'match attached families' },
        ],
      }],
    }));
  });
});
