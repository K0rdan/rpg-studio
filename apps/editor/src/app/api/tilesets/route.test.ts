import { MongoClient, Db, ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { createMongoClient } from '@/lib/mongoClient';
import { getTilesetStorage } from '@/lib/storage';
import { auth } from '@/lib/auth';
import { TILESETS } from '@/config/tilesets';
import { TILESET_OVERLAY_COLLECTION } from '@/lib/tilesetTiles';

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

describe('GET /api/tilesets', () => {
  let connection: MongoClient;
  let db: Db;
  const projectId = new ObjectId().toHexString();
  const userId = 'test-user-123';
  const tilesetId = new ObjectId();
  const registryId = TILESETS[0].id;
  let mockStorage: { getTilesetImageUrl: jest.Mock };

  const request = (search = '') =>
    ({ nextUrl: { searchParams: new URLSearchParams(search) } }) as unknown as NextRequest;

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
    await db.collection('tilesets').deleteMany({});
    await db.collection(TILESET_OVERLAY_COLLECTION).deleteMany({});

    await db.collection('tilesets').insertOne({
      _id: tilesetId,
      projectId,
      name: 'Forest',
      tile_width: 32,
      tile_height: 32,
      tiles: [{ id: 2, is_collidable: true }],
      storageLocation: `users/${userId}/projects/${projectId}/tilesets/forest.png`,
    });

    await db.collection('projects').insertOne({
      _id: new ObjectId(projectId),
      name: 'Test Project',
      userId,
      maps: [],
      tilesets: [tilesetId.toHexString()],
    });
  });

  afterAll(async () => {
    await connection.close();
  });

  it('gives registry tilesets an empty tiles array without a project', async () => {
    const response = await GET(request());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: registryId, tiles: [] })])
    );
  });

  it('returns the collision marks of project tilesets', async () => {
    const response = await GET(request(`projectId=${projectId}`));
    const data = await response.json();

    expect(
      data.find((tileset: { id: string }) => tileset.id === tilesetId.toHexString())
    ).toMatchObject({ tiles: [{ id: 2, is_collidable: true }] });
  });

  it('merges the project overlay onto registry tilesets', async () => {
    await db.collection(TILESET_OVERLAY_COLLECTION).insertOne({
      projectId,
      tilesetId: registryId,
      tiles: [{ id: 5, is_collidable: true }],
      updatedAt: new Date(),
    });

    const response = await GET(request(`projectId=${projectId}`));
    const data = await response.json();

    expect(data.find((tileset: { id: string }) => tileset.id === registryId)).toMatchObject({
      tiles: [{ id: 5, is_collidable: true }],
    });
  });

  it('merges the project overlay even when the project owns no tileset', async () => {
    await db
      .collection('projects')
      .updateOne({ _id: new ObjectId(projectId) }, { $set: { tilesets: [] } });
    await db.collection(TILESET_OVERLAY_COLLECTION).insertOne({
      projectId,
      tilesetId: registryId,
      tiles: [{ id: 8, is_collidable: true }],
      updatedAt: new Date(),
    });

    const response = await GET(request(`projectId=${projectId}`));
    const data = await response.json();

    expect(data).toEqual([
      expect.objectContaining({ id: registryId, tiles: [{ id: 8, is_collidable: true }] }),
    ]);
  });

  it('returns 401 without a session', async () => {
    mockedGetSession.mockResolvedValueOnce(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
  });
});
