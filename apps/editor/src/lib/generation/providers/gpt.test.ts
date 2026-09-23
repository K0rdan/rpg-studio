import { GenerationUnavailableError } from '../generationClient';
import { GptGenerationClient } from './gpt';

describe('GptGenerationClient', () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalBaseUrl = process.env.OPENAI_BASE_URL;
  const fetchMock = jest.fn();
  const pngBytes = new Uint8Array(Buffer.from('png bytes'));
  const encodedPng = Buffer.from(pngBytes).toString('base64');

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    delete process.env.OPENAI_BASE_URL;
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as typeof fetch;
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalKey;
    process.env.OPENAI_BASE_URL = originalBaseUrl;
  });

  it('reports availability from the API key and maps a missing key', async () => {
    const client = new GptGenerationClient();
    expect(client.isAvailable()).toBe(true);

    delete process.env.OPENAI_API_KEY;
    expect(client.isAvailable()).toBe(false);
    await expect(client.generate({
      model: 'gpt',
      prompt: 'structured prompt',
      referenceImages: [],
      tileSize: 32,
    })).rejects.toMatchObject({
      model: 'gpt',
      reason: 'misconfigured',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses /v1/images/generations without references and decodes b64_json', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: encodedPng }] }),
    });

    const result = await new GptGenerationClient().generate({
      model: 'gpt',
      prompt: 'structured prompt',
      referenceImages: [],
      tileSize: 32,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'gpt-image-1',
      prompt: 'structured prompt',
      size: '512x512',
      output_format: 'png',
    });
    expect(result).toEqual({
      mimeType: 'image/png',
      bytes: pngBytes,
      model: 'gpt',
    });
  });

  it('uses multipart /v1/images/edits with 1–16 PNG references and high fidelity', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: encodedPng }] }),
    });
    const first = new Uint8Array([1, 2, 3]);
    const second = new Uint8Array([4, 5, 6]);

    await new GptGenerationClient().generate({
      model: 'gpt',
      prompt: 'match attached families',
      referenceImages: [
        { tilesetId: 'a', mimeType: 'image/png', bytes: first },
        { tilesetId: 'b', mimeType: 'image/png', bytes: second },
      ],
      tileSize: 64,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/edits',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer test-key' },
      }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.get('model')).toBe('gpt-image-1');
    expect(form.get('prompt')).toBe('match attached families');
    expect(form.get('input_fidelity')).toBe('high');
    expect(form.getAll('image[]')).toHaveLength(2);
  });

  it('maps rate_limit, quota, and upstream failures', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { code: 'rate_limit_exceeded' } }),
    });
    await expect(new GptGenerationClient().generate({
      model: 'gpt',
      prompt: 'structured prompt',
      referenceImages: [],
      tileSize: 32,
    })).rejects.toMatchObject({ reason: 'rate_limit' });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { code: 'insufficient_quota' } }),
    });
    await expect(new GptGenerationClient().generate({
      model: 'gpt',
      prompt: 'structured prompt',
      referenceImages: [],
      tileSize: 32,
    })).rejects.toMatchObject({
      reason: 'quota',
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'provider failed' } }),
    });
    await expect(new GptGenerationClient().generate({
      model: 'gpt',
      prompt: 'structured prompt',
      referenceImages: [],
      tileSize: 32,
    })).rejects.toBeInstanceOf(GenerationUnavailableError);
  });
});
