import { MongoClient, Db, ObjectId } from 'mongodb';
import { GET, PATCH, DELETE } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { createMongoClient } from '@/lib/mongoClient';
import { getTilesetStorage } from '@/lib/storage';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { TILESETS } from '@/config/tilesets';
import { TILESET_OVERLAY_COLLECTION } from '@/lib/tilesetTiles';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
  closeDatabaseConnection: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  getTilesetStorage: jest.fn(),
}));

jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
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

describe('Tileset by ID API', () => {
  let connection: MongoClient;
  let db: Db;
  const projectId = new ObjectId().toHexString();
  const userId = 'test-user-123';
  let tilesetId: string;
  let mockStorage: {
    getTilesetImageUrl: jest.Mock;
    deleteTilesetAssets: jest.Mock;
  };

  beforeAll(async () => {
    connection = createMongoClient(globalThis.__ATLAS_URI__!);
    await connection.connect();
    db = connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });

    // Setup mock storage
    mockStorage = {
      getTilesetImageUrl: jest.fn(),
      deleteTilesetAssets: jest.fn(),
    };
    mockedGetTilesetStorage.mockReturnValue(mockStorage);
  });

  beforeEach(async () => {
    mockedGetSession.mockResolvedValue({ user: { id: userId } });

    // Clean up collections
    await db.collection('projects').deleteMany({});
    await db.collection('tilesets').deleteMany({});
    await db.collection('maps').deleteMany({});
    await db.collection(TILESET_OVERLAY_COLLECTION).deleteMany({});

    // Create a test project
    await db.collection('projects').insertOne({
      _id: new ObjectId(projectId),
      name: 'Test Project',
      maps: [],
      characters: [],
      tilesets: [],
      userId,
    });

    // Create a test tileset
    const tilesetObjId = new ObjectId();
    tilesetId = tilesetObjId.toHexString();
    await db.collection('tilesets').insertOne({
      _id: tilesetObjId,
      projectId,
      name: 'Test Tileset',
      tile_width: 32,
      tile_height: 32,
      storageLocation: 'projects/test/tilesets/ts1.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db
      .collection('projects')
      .updateOne(
        { _id: new ObjectId(projectId) },
        { $set: { tilesets: [tilesetId] } },
      );

    // Reset mocks
    mockStorage.getTilesetImageUrl.mockClear();
    mockStorage.deleteTilesetAssets.mockClear();
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('GET /api/projects/[projectId]/tilesets/[tilesetId]', () => {
    it('should return tileset by ID with image URL', async () => {
      mockStorage.getTilesetImageUrl.mockResolvedValue(
        'https://storage.example.com/ts1.png',
      );

      const mockRequest = {} as NextRequest;

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId, tilesetId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: tilesetId,
        name: 'Test Tileset',
        tile_width: 32,
        tile_height: 32,
        image_source: 'https://storage.example.com/ts1.png',
      });

      expect(mockStorage.getTilesetImageUrl).toHaveBeenCalledWith({
        location: { storageKey: 'projects/test/tilesets/ts1.png' },
      });
    });

    it('should return 404 if tileset not found', async () => {
      const nonExistentTilesetId = new ObjectId().toHexString();
      const mockRequest = {} as NextRequest;

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId, tilesetId: nonExistentTilesetId }),
      });

      expect(response.status).toBe(404);
    });

    it('should return 404 if project not found', async () => {
      const nonExistentProjectId = new ObjectId().toHexString();
      const mockRequest = {} as NextRequest;

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId: nonExistentProjectId, tilesetId }),
      });

      expect(response.status).toBe(404);
    });

    it('should expose an empty tiles array when the tileset has no collision marks', async () => {
      mockStorage.getTilesetImageUrl.mockResolvedValue('https://storage.example.com/ts1.png');

      const response = await GET({} as NextRequest, {
        params: Promise.resolve({ projectId, tilesetId }),
      });
      const data = await response.json();

      expect(data.tiles).toEqual([]);
    });

    it('should expose the stored collision marks', async () => {
      mockStorage.getTilesetImageUrl.mockResolvedValue('https://storage.example.com/ts1.png');
      await db
        .collection('tilesets')
        .updateOne(
          { _id: new ObjectId(tilesetId) },
          { $set: { tiles: [{ id: 7, is_collidable: true }] } },
        );

      const response = await GET({} as NextRequest, {
        params: Promise.resolve({ projectId, tilesetId }),
      });
      const data = await response.json();

      expect(data.tiles).toEqual([{ id: 7, is_collidable: true }]);
    });

    it('should merge the project overlay onto a registry tileset', async () => {
      await db.collection(TILESET_OVERLAY_COLLECTION).insertOne({
        projectId,
        tilesetId: TILESETS[0].id,
        tiles: [{ id: 3, is_collidable: true }],
        updatedAt: new Date(),
      });

      const response = await GET({} as NextRequest, {
        params: Promise.resolve({ projectId, tilesetId: TILESETS[0].id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: TILESETS[0].id,
        tiles: [{ id: 3, is_collidable: true }],
      });
    });
  });

  describe('PATCH /api/projects/[projectId]/tilesets/[tilesetId]', () => {
    const patchRequest = (body: unknown) =>
      ({ json: jest.fn().mockResolvedValue(body) }) as unknown as NextRequest;

    it('should return 401 if not authenticated', async () => {
      mockedGetSession.mockResolvedValueOnce(null);

      const response = await PATCH(patchRequest({ tiles: [] }), {
        params: Promise.resolve({ projectId, tilesetId }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 403 if user does not own project', async () => {
      mockedGetSession.mockResolvedValueOnce({ user: { id: 'other-user-456' } });

      const response = await PATCH(patchRequest({ tiles: [] }), {
        params: Promise.resolve({ projectId, tilesetId }),
      });

      expect(response.status).toBe(403);
    });

    it('should store only blocking tiles with an integer id', async () => {
      mockStorage.getTilesetImageUrl.mockResolvedValue('https://storage.example.com/ts1.png');

      const response = await PATCH(
        patchRequest({
          tiles: [
            { id: 4, is_collidable: true },
            { id: 5, is_collidable: false },
          ],
        }),
        { params: Promise.resolve({ projectId, tilesetId }) },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: tilesetId,
        image_source: 'https://storage.example.com/ts1.png',
        tiles: [{ id: 4, is_collidable: true }],
      });

      const stored = await db
        .collection('tilesets')
        .findOne({ _id: new ObjectId(tilesetId) });
      expect(stored?.tiles).toEqual([{ id: 4, is_collidable: true }]);
    });

    it('should replace the stored tiles on a later call', async () => {
      mockStorage.getTilesetImageUrl.mockResolvedValue('https://storage.example.com/ts1.png');

      await PATCH(patchRequest({ tiles: [{ id: 4, is_collidable: true }] }), {
        params: Promise.resolve({ projectId, tilesetId }),
      });
      await PATCH(patchRequest({ tiles: [{ id: 9, is_collidable: true }] }), {
        params: Promise.resolve({ projectId, tilesetId }),
      });

      const stored = await db
        .collection('tilesets')
        .findOne({ _id: new ObjectId(tilesetId) });
      expect(stored?.tiles).toEqual([{ id: 9, is_collidable: true }]);
    });

    it('should upsert a project overlay for a registry tileset', async () => {
      const registryId = TILESETS[0].id;

      const response = await PATCH(patchRequest({ tiles: [{ id: 2, is_collidable: true }] }), {
        params: Promise.resolve({ projectId, tilesetId: registryId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: registryId,
        image_source: TILESETS[0].image_source,
        tiles: [{ id: 2, is_collidable: true }],
      });

      await PATCH(patchRequest({ tiles: [{ id: 6, is_collidable: true }] }), {
        params: Promise.resolve({ projectId, tilesetId: registryId }),
      });

      const overlays = await db
        .collection(TILESET_OVERLAY_COLLECTION)
        .find({ projectId, tilesetId: registryId })
        .toArray();
      expect(overlays).toHaveLength(1);
      expect(overlays[0].tiles).toEqual([{ id: 6, is_collidable: true }]);
    });

    it('should return 400 for an invalid payload', async () => {
      const bodies: unknown[] = [
        {},
        { tiles: 'nope' },
        { tiles: [{ id: -1, is_collidable: true }] },
        { tiles: [{ id: 1.5, is_collidable: true }] },
        { tiles: [{ is_collidable: true }] },
      ];

      for (const body of bodies) {
        const response = await PATCH(patchRequest(body), {
          params: Promise.resolve({ projectId, tilesetId }),
        });

        expect(response.status).toBe(400);
      }

      const stored = await db
        .collection('tilesets')
        .findOne({ _id: new ObjectId(tilesetId) });
      expect(stored?.tiles).toBeUndefined();
    });

    it('should return 404 for an unknown tileset', async () => {
      const unknownObjectId = new ObjectId().toHexString();

      for (const unknownId of [unknownObjectId, 'not-a-tileset']) {
        const response = await PATCH(patchRequest({ tiles: [] }), {
          params: Promise.resolve({ projectId, tilesetId: unknownId }),
        });

        expect(response.status).toBe(404);
      }
    });
  });

  describe('DELETE /api/projects/[projectId]/tilesets/[tilesetId]', () => {
    it('should delete tileset successfully', async () => {
      mockStorage.deleteTilesetAssets.mockResolvedValue(undefined);

      const mockRequest = {} as NextRequest;

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId, tilesetId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('deleted successfully');

      // Verify storage deletion was called
      expect(mockStorage.deleteTilesetAssets).toHaveBeenCalledWith({
        userId: 'test-user-123',
        projectId,
        tilesetId,
      });

      // Verify tileset was removed from database
      const tileset = await db
        .collection('tilesets')
        .findOne({ _id: new ObjectId(tilesetId) });
      expect(tileset).toBeNull();

      // Verify tileset was removed from project
      const project = await db
        .collection('projects')
        .findOne({ _id: new ObjectId(projectId) });
      expect(project?.tilesets).not.toContain(tilesetId);
    });

    it('should prevent deletion if tileset is in use by maps', async () => {
      // Create a map using this tileset
      const mapId = new ObjectId();
      await db.collection('maps').insertOne({
        _id: mapId,
        name: 'Test Map',
        width: 10,
        height: 10,
        tilesetId: tilesetId,
        layers: [],
      });

      const mockRequest = {} as NextRequest;

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId, tilesetId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('in use');
      expect(data.maps).toBeDefined();
      expect(Array.isArray(data.maps)).toBe(true);
      expect(data.maps.length).toBe(1);

      // Verify tileset was NOT deleted
      const tileset = await db
        .collection('tilesets')
        .findOne({ _id: new ObjectId(tilesetId) });
      expect(tileset).not.toBeNull();
    });

    it('should return 404 if tileset not found', async () => {
      const nonExistentTilesetId = new ObjectId().toHexString();
      const mockRequest = {} as NextRequest;

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId, tilesetId: nonExistentTilesetId }),
      });

      expect(response.status).toBe(404);
    });
  });
});

