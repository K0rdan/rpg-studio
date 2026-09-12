import { MongoClient, Db, ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { createMongoClient } from '@/lib/mongoClient';
import { getTilesetStorage } from '@/lib/storage';
import { auth } from '@/lib/auth';
import { TILESETS } from '@/config/tilesets';
import { resolveMapTileset } from '@packages/core';

jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}));

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
  closeDatabaseConnection: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  getTilesetStorage: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;
const mockedGetTilesetStorage = getTilesetStorage as jest.Mock;
const mockedGetSession = auth.api.getSession as unknown as jest.Mock;

describe('GET /api/projects/[projectId]/preview', () => {
  let connection: MongoClient;
  let db: Db;
  const projectId = new ObjectId().toHexString();
  const userId = 'test-user-123';
  const mapId = new ObjectId();
  const tilesetId = new ObjectId();
  let mockStorage: { getTilesetImageUrl: jest.Mock };

  const request = {} as NextRequest;
  const params = () => ({ params: Promise.resolve({ projectId }) });

  beforeAll(async () => {
    connection = createMongoClient(globalThis.__ATLAS_URI__!);
    await connection.connect();
    db = connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });

    mockStorage = { getTilesetImageUrl: jest.fn() };
    mockedGetTilesetStorage.mockReturnValue(mockStorage);
  });

  beforeEach(async () => {
    mockedGetSession.mockResolvedValue({ user: { id: userId } });
    mockStorage.getTilesetImageUrl.mockReset();
    mockStorage.getTilesetImageUrl.mockResolvedValue('https://storage.example.com/ts.png');

    await db.collection('projects').deleteMany({});
    await db.collection('maps').deleteMany({});
    await db.collection('tilesets').deleteMany({});
    await db.collection('sprites').deleteMany({});

    await db.collection('maps').insertOne({
      _id: mapId,
      name: 'Overworld',
      width: 2,
      height: 1,
      tilesetId: tilesetId.toHexString(),
      layers: [
        { name: 'Ground', data: [1, 1] },
        { name: 'Decor', data: [4, -1] },
      ],
    });

    await db.collection('tilesets').insertOne({
      _id: tilesetId,
      projectId,
      name: 'Forest',
      tile_width: 32,
      tile_height: 32,
      source_tile_width: 128,
      source_tile_height: 128,
      storageLocation: `users/${userId}/projects/${projectId}/tilesets/forest.png`,
    });

    await db.collection('projects').insertOne({
      _id: new ObjectId(projectId),
      name: 'Test Project',
      userId,
      maps: [mapId.toHexString()],
      tilesets: [tilesetId.toHexString()],
    });
  });

  afterAll(async () => {
    await connection.close();
  });

  it('returns project tilesets with a signed image URL and their source tile grid', async () => {
    const response = await GET(request, params());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tilesets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: tilesetId.toHexString(),
          name: 'Forest',
          image_source: 'https://storage.example.com/ts.png',
          tile_width: 32,
          source_tile_width: 128,
          source_tile_height: 128,
        }),
      ])
    );
  });

  it('lets the engine resolve the tileset the map was painted with', async () => {
    const response = await GET(request, params());
    const data = await response.json();

    expect(resolveMapTileset(data.maps[0], data.tilesets).id).toBe(tilesetId.toHexString());
  });

  it('includes static registry tilesets so maps painted with them still resolve', async () => {
    await db.collection('maps').updateOne({ _id: mapId }, { $set: { tilesetId: TILESETS[0].id } });

    const response = await GET(request, params());
    const data = await response.json();

    const staticTileset = data.tilesets.find(
      (tileset: { id: string }) => tileset.id === TILESETS[0].id
    );
    expect(staticTileset).toMatchObject({ image_source: TILESETS[0].image_source });
    expect(resolveMapTileset(data.maps[0], data.tilesets).id).toBe(TILESETS[0].id);
  });

  it('keeps a tileset without a usable image out of the way instead of failing', async () => {
    mockStorage.getTilesetImageUrl.mockRejectedValue(new Error('storage offline'));

    const response = await GET(request, params());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(
      data.tilesets.find((tileset: { id: string }) => tileset.id === tilesetId.toHexString())
    ).toMatchObject({ image_source: '' });
  });
});
