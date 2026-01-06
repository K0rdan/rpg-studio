import { MongoClient, Db, ObjectId } from 'mongodb';
import { GET, POST } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { getTilesetStorage } from '@/lib/storage';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
  closeDatabaseConnection: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  getTilesetStorage: jest.fn(),
}));

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;
const mockedGetTilesetStorage = getTilesetStorage as jest.Mock;
const mockedAuth = auth as jest.Mock;

describe('Tileset API', () => {
  let connection: MongoClient;
  let db: Db;
  const projectId = new ObjectId().toHexString();
  const userId = 'test-user-123';
  let mockStorage: {
    uploadTilesetImage: jest.Mock;
    getTilesetImageUrl: jest.Mock;
    deleteTilesetAssets: jest.Mock;
  };

  beforeAll(async () => {
    connection = await MongoClient.connect(globalThis.__ATLAS_URI__!);
    db = await connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });

    // Setup mock storage
    mockStorage = {
      uploadTilesetImage: jest.fn(),
      getTilesetImageUrl: jest.fn(),
      deleteTilesetAssets: jest.fn(),
    };
    mockedGetTilesetStorage.mockReturnValue(mockStorage);
  });

  beforeEach(async () => {
    // Default authenticated session
    mockedAuth.mockResolvedValue({ user: { id: userId } });

    // Clean up collections
    await db.collection('projects').deleteMany({});
    await db.collection('tilesets').deleteMany({});
    await db.collection('maps').deleteMany({});

    // Create a test project
    await db.collection('projects').insertOne({
      _id: new ObjectId(projectId),
      name: 'Test Project',
      userId: userId,
      maps: [],
      characters: [],
      tilesets: [],
    });

    // Reset mocks
    mockStorage.uploadTilesetImage.mockClear();
    mockStorage.getTilesetImageUrl.mockClear();
    mockStorage.deleteTilesetAssets.mockClear();
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('GET /api/projects/[projectId]/tilesets', () => {
    it('should return empty array when no tilesets exist', async () => {
      const mockRequest = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest;

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('should return list of tilesets with image URLs', async () => {
      // Create test tilesets
      const tileset1Id = new ObjectId();
      const tileset2Id = new ObjectId();

      await db.collection('tilesets').insertMany([
        {
          _id: tileset1Id,
          projectId,
          name: 'Tileset 1',
          tile_width: 32,
          tile_height: 32,
          storageLocation: 'projects/test/tilesets/ts1.png',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: tileset2Id,
          projectId,
          name: 'Tileset 2',
          tile_width: 64,
          tile_height: 64,
          storageLocation: 'projects/test/tilesets/ts2.png',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await db.collection('projects').updateOne(
        { _id: new ObjectId(projectId) },
        {
          $set: {
            tilesets: [tileset1Id.toHexString(), tileset2Id.toHexString()],
          },
        },
      );

      mockStorage.getTilesetImageUrl
        .mockResolvedValueOnce('https://storage.example.com/ts1.png')
        .mockResolvedValueOnce('https://storage.example.com/ts2.png');

      const mockRequest = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest;

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      expect(data[0]).toMatchObject({
        id: tileset1Id.toHexString(),
        name: 'Tileset 1',
        image_source: 'https://storage.example.com/ts1.png',
        tile_width: 32,
        tile_height: 32,
      });
      expect(data[1]).toMatchObject({
        id: tileset2Id.toHexString(),
        name: 'Tileset 2',
        image_source: 'https://storage.example.com/ts2.png',
        tile_width: 64,
        tile_height: 64,
      });
    });

    it('should return 404 if project not found', async () => {
      const nonExistentProjectId = new ObjectId().toHexString();
      const mockRequest = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest;

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId: nonExistentProjectId }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/projects/[projectId]/tilesets', () => {
    it('should return 401 if not authenticated', async () => {
      mockedAuth.mockResolvedValueOnce(null);

      const mockRequest = {
        formData: jest.fn(),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 403 if user does not own project', async () => {
      mockedAuth.mockResolvedValueOnce({ user: { id: 'other-user-456' } });

      const mockRequest = {
        formData: jest.fn(),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId }),
      });

      expect(response.status).toBe(403);
    });

    it('should upload a tileset successfully', async () => {
      const mockFile = new File(['test image data'], 'test.png', {
        type: 'image/png',
      });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('name', 'Test Tileset');
      formData.append('tile_width', '32');
      formData.append('tile_height', '32');

      mockStorage.uploadTilesetImage.mockResolvedValue({
        storageKey: 'projects/test/tilesets/ts1.png',
      });
      mockStorage.getTilesetImageUrl.mockResolvedValue(
        'https://storage.example.com/ts1.png',
      );

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        name: 'Test Tileset',
        tile_width: 32,
        tile_height: 32,
        image_source: 'https://storage.example.com/ts1.png',
      });
      expect(data.id).toBeDefined();

      // Verify storage was called
      expect(mockStorage.uploadTilesetImage).toHaveBeenCalledWith({
        userId,
        projectId,
        tilesetId: expect.any(String),
        mimeType: 'image/png',
        data: expect.any(Buffer),
      });

      // Verify database record
      const tileset = await db
        .collection('tilesets')
        .findOne({ name: 'Test Tileset' });
      expect(tileset).not.toBeNull();
      expect(tileset?.projectId).toBe(projectId);

      // Verify project was updated
      const project = await db
        .collection('projects')
        .findOne({ _id: new ObjectId(projectId) });
      expect(project?.tilesets).toContain(data.id);
    });

    it('should reject file that is too large', async () => {
      // Create a file larger than 10MB
      const largeFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)],
        'large.png',
        {
          type: 'image/png',
        },
      );
      const formData = new FormData();
      formData.append('file', largeFile);
      formData.append('name', 'Large Tileset');
      formData.append('tile_width', '32');
      formData.append('tile_height', '32');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.message).toContain('exceeds maximum');
    });

    it('should reject unsupported file format', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('name', 'Test Tileset');
      formData.append('tile_width', '32');
      formData.append('tile_height', '32');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Unsupported file format');
    });

    it('should reject missing required fields', async () => {
      const formData = new FormData();
      formData.append('name', 'Test Tileset');
      // Missing file, tile_width, tile_height

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Missing required fields');
    });

    it('should reject invalid tile dimensions', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('name', 'Test Tileset');
      formData.append('tile_width', '0');
      formData.append('tile_height', '-1');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('positive integers');
    });
  });
});
