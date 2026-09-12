import { CharsetStyle } from '@packages/types';
import { ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { requireProjectAccess } from '@/lib/apiAuth';
import { getGeminiClient } from '@/lib/gemini';
import { POST } from './route';

jest.mock('@/lib/apiAuth', () => ({
  requireProjectAccess: jest.fn(),
}));

jest.mock('@/lib/gemini', () => ({
  ...jest.requireActual('@/lib/gemini'),
  getGeminiClient: jest.fn(),
}));

const mockedRequireProjectAccess = requireProjectAccess as jest.Mock;
const mockedGetGeminiClient = getGeminiClient as jest.Mock;

describe('Generate charset API frame dimensions', () => {
  const projectId = new ObjectId().toHexString();
  const generateContent = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedRequireProjectAccess.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      project: {
        _id: new ObjectId(projectId),
        userId: 'user-1',
      },
    });

    const sourceImage = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 4,
        background: '#00000000',
      },
    }).png().toBuffer();
    generateContent.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              data: sourceImage.toString('base64'),
            },
          }],
        },
      }],
    });
    mockedGetGeminiClient.mockReturnValue({
      models: { generateContent },
    });
  });

  function makeRequest(frameWidth: number, frameHeight: number): NextRequest {
    return {
      json: jest.fn().mockResolvedValue({
        name: 'Configurable charset',
        frame_width: frameWidth,
        frame_height: frameHeight,
        style: CharsetStyle.FANTASY,
      }),
    } as unknown as NextRequest;
  }

  it('resizes a generated sheet from independent 96×48 frame dimensions', async () => {
    const response = await POST(makeRequest(96, 48), {
      params: Promise.resolve({ projectId }),
    });
    const data = await response.json();
    const output = Buffer.from(
      data.preview_data.replace('data:image/png;base64,', ''),
      'base64',
    );
    const metadata = await sharp(output).metadata();

    expect(response.status).toBe(200);
    expect(metadata.width).toBe(288);
    expect(metadata.height).toBe(192);
    expect(data.generation_params).toMatchObject({
      frame_width: 96,
      frame_height: 48,
    });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          imageConfig: { aspectRatio: '3:2' },
        }),
      }),
    );
  });

  it.each([
    [0, 48],
    [48.5, 48],
    [513, 48],
  ])('rejects unsupported dimensions %s×%s', async (frameWidth, frameHeight) => {
    const response = await POST(makeRequest(frameWidth, frameHeight), {
      params: Promise.resolve({ projectId }),
    });

    expect(response.status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });
});
