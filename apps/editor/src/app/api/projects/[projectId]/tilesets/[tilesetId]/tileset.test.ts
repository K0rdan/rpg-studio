import { MongoClient, Db, ObjectId } from 'mongodb';
import { GET, DELETE } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { getTilesetStorage } from '@/lib/storage';
import { NextRequest } from 'next/server';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
  closeDatabaseConnection: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  getTilesetStorage: jest.fn(),
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;
const mockedGetTilesetStorage = getTilesetStorage as jest.Mock;

describe('Tileset by ID API', () => {
  let connection: MongoClient;
  let db: Db;
  const projectId = new ObjectId().toHexString();
  let tilesetId: string;
  let mockStorage: {
    getTilesetImageUrl: jest.Mock;
    deleteTilesetAssets: jest.Mock;
  };

  beforeAll(async () => {
    connection = await MongoClient.connect(globalThis.__MONGO_URI__!);
    db = await connection.db(globalThis.__MONGO_DB_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });

    // Setup mock storage
    mockStorage = {
      getTilesetImageUrl: jest.fn(),
      deleteTilesetAssets: jest.fn(),
    };
    mockedGetTilesetStorage.mockReturnValue(mockStorage);
  });

  beforeEach(async () => {
    // Clean up collections
    await db.collection('projects').deleteMany({});
    await db.collection('tilesets').deleteMany({});
    await db.collection('maps').deleteMany({});

    // Create a test project
    await db.collection('projects').insertOne({
      _id: new ObjectId(projectId),
      name: 'Test Project',
      maps: [],
      characters: [],
      tilesets: [],
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

    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { tilesets: [tilesetId] } }
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
      mockStorage.getTilesetImageUrl.mockResolvedValue('https://storage.example.com/ts1.png');

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
        projectId,
        tilesetId,
      });

      // Verify tileset was removed from database
      const tileset = await db.collection('tilesets').findOne({ _id: new ObjectId(tilesetId) });
      expect(tileset).toBeNull();

      // Verify tileset was removed from project
      const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
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
      const tileset = await db.collection('tilesets').findOne({ _id: new ObjectId(tilesetId) });
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


