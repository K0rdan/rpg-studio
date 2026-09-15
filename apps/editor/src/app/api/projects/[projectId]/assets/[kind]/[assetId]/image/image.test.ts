import { MongoClient, Db, ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';
import { AssetNotFoundError } from '@packages/storage';
import { connectToDatabase } from '@/lib/mongodb';
import { createMongoClient } from '@/lib/mongoClient';
import { getTilesetStorage } from '@/lib/storage';
import { auth } from '@/lib/auth';
import { TILESETS } from '@/config/tilesets';
import { GET } from './route';

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
  auth: { api: { getSession: jest.fn() } },
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;
const mockedGetTilesetStorage = getTilesetStorage as jest.Mock;
const mockedGetSession = auth.api.getSession as unknown as jest.Mock;

describe('GET /api/projects/[projectId]/assets/[kind]/[assetId]/image', () => {
  let connection: MongoClient;
  let db: Db;
  const projectId = new ObjectId().toHexString();
  const userId = 'test-user-123';
  const tilesetId = new ObjectId();
  const spriteId = new ObjectId();
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  let mockStorage: { downloadFile: jest.Mock };

  const request = {} as NextRequest;
  const params = (kind: string, assetId: string) => ({
    params: Promise.resolve({ projectId, kind, assetId }),
  });

  beforeAll(async () => {
    connection = createMongoClient(globalThis.__ATLAS_URI__!);
    await connection.connect();
    db = connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });

    mockStorage = { downloadFile: jest.fn() };
    mockedGetTilesetStorage.mockReturnValue(mockStorage);
  });

  beforeEach(async () => {
    mockedGetSession.mockResolvedValue({ user: { id: userId } });
    mockStorage.downloadFile.mockReset();
    mockStorage.downloadFile.mockResolvedValue({
      data: pngBytes,
      mimeType: 'image/png',
      etag: '"abc123"',
    });

    await db.collection('projects').deleteMany({});
    await db.collection('tilesets').deleteMany({});
    await db.collection('sprites').deleteMany({});

    await db.collection('tilesets').insertOne({
      _id: tilesetId,
      projectId,
      name: 'Forest',
      tile_width: 32,
      tile_height: 32,
      storageLocation: `users/${userId}/projects/${projectId}/tilesets/forest.png`,
    });

    await db.collection('sprites').insertOne({
      _id: spriteId,
      projectId,
      name: 'Hero',
      mimeType: 'image/png',
    });

    await db.collection('projects').insertOne({
      _id: new ObjectId(projectId),
      name: 'Test Project',
      userId,
      maps: [],
      tilesets: [tilesetId.toHexString()],
      sprites: [spriteId.toHexString()],
    });
  });

  afterAll(async () => {
    await connection.close();
  });

  it('serves tileset bytes from the key stored on the tileset', async () => {
    const response = await GET(request, params('tileset', tilesetId.toHexString()));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('ETag')).toBe('"abc123"');
    expect(response.headers.get('Cache-Control')).toContain('immutable');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(pngBytes);
    expect(mockStorage.downloadFile).toHaveBeenCalledWith(
      `users/${userId}/projects/${projectId}/tilesets/forest.png`,
    );
  });

  it('serves charset bytes from the canonical sprite key', async () => {
    const response = await GET(request, params('charset', spriteId.toHexString()));

    expect(response.status).toBe(200);
    expect(mockStorage.downloadFile).toHaveBeenCalledWith(
      `users/${userId}/projects/${projectId}/sprites/${spriteId.toHexString()}.png`,
    );
  });

  it('answers 404 for an asset belonging to another project', async () => {
    const otherTilesetId = new ObjectId();
    await db.collection('tilesets').insertOne({
      _id: otherTilesetId,
      projectId: new ObjectId().toHexString(),
      name: 'Someone else',
      storageLocation: 'users/other/projects/other/tilesets/other.png',
    });

    const response = await GET(request, params('tileset', otherTilesetId.toHexString()));

    expect(response.status).toBe(404);
    expect(mockStorage.downloadFile).not.toHaveBeenCalled();
  });

  it('answers 404 for registry tilesets, whose image ships with the app', async () => {
    const response = await GET(request, params('tileset', TILESETS[0].id));

    expect(response.status).toBe(404);
    expect(mockStorage.downloadFile).not.toHaveBeenCalled();
  });

  it('answers 404 when storage has no blob for the asset', async () => {
    mockStorage.downloadFile.mockRejectedValue(new AssetNotFoundError('gone'));

    const response = await GET(request, params('tileset', tilesetId.toHexString()));

    expect(response.status).toBe(404);
  });

  it('answers 502 when storage is unreachable', async () => {
    mockStorage.downloadFile.mockRejectedValue(new Error('storage offline'));

    const response = await GET(request, params('tileset', tilesetId.toHexString()));

    expect(response.status).toBe(502);
  });

  it('rejects an unknown asset kind', async () => {
    const response = await GET(request, params('sound', tilesetId.toHexString()));

    expect(response.status).toBe(400);
  });

  it('requires a session', async () => {
    mockedGetSession.mockResolvedValueOnce(null);

    const response = await GET(request, params('tileset', tilesetId.toHexString()));

    expect(response.status).toBe(401);
  });
});
