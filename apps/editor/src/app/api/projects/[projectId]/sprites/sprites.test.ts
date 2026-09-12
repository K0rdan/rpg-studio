import { ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { requireProjectAccess } from '@/lib/apiAuth';
import { connectToDatabase } from '@/lib/mongodb';
import { getTilesetStorage } from '@/lib/storage';
import { POST } from './route';

jest.mock('@/lib/apiAuth', () => ({
  requireProjectAccess: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  getTilesetStorage: jest.fn(),
}));

const mockedRequireProjectAccess = requireProjectAccess as jest.Mock;
const mockedConnectToDatabase = connectToDatabase as jest.Mock;
const mockedGetTilesetStorage = getTilesetStorage as jest.Mock;

describe('Sprite API frame dimensions', () => {
  const projectId = new ObjectId().toHexString();
  const userId = 'user-1';
  const insertOne = jest.fn();
  const updateOne = jest.fn();
  const uploadFile = jest.fn();
  const getTilesetImageUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireProjectAccess.mockResolvedValue({
      ok: true,
      userId,
      project: {
        _id: new ObjectId(projectId),
        userId,
        sprites: [],
      },
    });
    insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    mockedConnectToDatabase.mockResolvedValue({
      db: {
        collection: jest.fn((name: string) => (
          name === 'sprites' ? { insertOne } : { updateOne }
        )),
      },
    });
    getTilesetImageUrl.mockResolvedValue('https://example.test/sprite.png');
    mockedGetTilesetStorage.mockReturnValue({
      uploadFile,
      getTilesetImageUrl,
    });
  });

  async function makeRequest(
    width: number,
    height: number,
    frameWidth: string,
    frameHeight: string,
  ): Promise<NextRequest> {
    const image = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: '#00000000',
      },
    }).png().toBuffer();
    const file = new File([new Uint8Array(image)], 'charset.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', 'Configurable charset');
    formData.append('frame_width', frameWidth);
    formData.append('frame_height', frameHeight);

    return {
      formData: jest.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;
  }

  it('accepts independent frame dimensions outside the former preset list', async () => {
    const request = await makeRequest(288, 192, '96', '48');

    const response = await POST(request, {
      params: Promise.resolve({ projectId }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.frame_width).toBe(96);
    expect(data.frame_height).toBe(48);
    expect(uploadFile).toHaveBeenCalledTimes(1);
  });

  it('rejects non-positive frame dimensions', async () => {
    const request = await makeRequest(192, 192, '0', '48');

    const response = await POST(request, {
      params: Promise.resolve({ projectId }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringContaining('positive integers'),
    });
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('rejects an image that does not match the configured 3×4 grid', async () => {
    const request = await makeRequest(192, 192, '96', '96');

    const response = await POST(request, {
      params: Promise.resolve({ projectId }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringContaining('3×4 grid'),
    });
    expect(uploadFile).not.toHaveBeenCalled();
  });
});
