import { MongoClient, Db, ObjectId } from 'mongodb';
import { POST, GET } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
  closeDatabaseConnection: jest.fn(),
}));

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;
const mockedAuth = auth as jest.Mock;

describe('Project API', () => {
  let connection: MongoClient;
  let db: Db;
  const userId = 'test-user-123';
  const otherUserId = 'other-user-456';

  beforeAll(async () => {
    connection = await MongoClient.connect(globalThis.__ATLAS_URI__!);
    db = await connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });
  });

  beforeEach(async () => {
    // Default authenticated session
    mockedAuth.mockResolvedValue({ user: { id: userId } });

    // Clean up collections
    await db.collection('projects').deleteMany({});
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('POST /api/projects', () => {
    it('should return 401 if not authenticated', async () => {
      mockedAuth.mockResolvedValueOnce(null);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ name: 'Test Project' }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
    });

    it('should create a new project with userId', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ name: 'Test Project' }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.name).toBe('Test Project');
      expect(data.userId).toBe(userId);

      const projects = db.collection('projects');
      const insertedProject = await projects.findOne({ name: 'Test Project' });
      expect(insertedProject).not.toBeNull();
      expect(insertedProject?.name).toEqual('Test Project');
      expect(insertedProject?.userId).toEqual(userId);
    });

    it('should return 400 if name is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({}),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('required');
    });
  });

  describe('GET /api/projects', () => {
    it('should return 401 if not authenticated', async () => {
      mockedAuth.mockResolvedValueOnce(null);

      const response = await GET();

      expect(response.status).toBe(401);
    });

    it('should return only projects belonging to the authenticated user', async () => {
      // Create projects for different users
      await db.collection('projects').insertMany([
        {
          _id: new ObjectId(),
          name: 'User 1 Project 1',
          userId,
          maps: [],
          characters: [],
          tilesets: [],
        },
        {
          _id: new ObjectId(),
          name: 'User 1 Project 2',
          userId,
          maps: [],
          characters: [],
          tilesets: [],
        },
        {
          _id: new ObjectId(),
          name: 'User 2 Project',
          userId: otherUserId,
          maps: [],
          characters: [],
          tilesets: [],
        },
      ]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      expect(data.every((p: any) => p.userId === userId)).toBe(true);
      expect(data.some((p: any) => p.name === 'User 1 Project 1')).toBe(true);
      expect(data.some((p: any) => p.name === 'User 1 Project 2')).toBe(true);
      expect(data.some((p: any) => p.name === 'User 2 Project')).toBe(false);
    });

    it('should return empty array if user has no projects', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });
  });
});
