import { GenerationUnavailableError } from '../generationClient';
import { ClaudeGenerationClient } from './claude';

describe('ClaudeGenerationClient', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as typeof fetch;
  });

  it('is never available and refuses generation without calling Anthropic', async () => {
    const client = new ClaudeGenerationClient();

    expect(client.model).toBe('claude');
    expect(client.isAvailable()).toBe(false);
    await expect(client.generate({
      model: 'claude',
      prompt: 'structured prompt',
      referenceImages: [],
      tileSize: 32,
    })).rejects.toMatchObject({
      name: 'GenerationUnavailableError',
      model: 'claude',
      reason: 'not_supported',
    });
    await expect(client.generate({
      model: 'claude',
      prompt: 'structured prompt',
      referenceImages: [],
      tileSize: 32,
    })).rejects.toBeInstanceOf(GenerationUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
