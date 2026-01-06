import { MongoClient, Db, ObjectId } from 'mongodb';
import { POST, GET } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest } from 'next/server';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}));

// Mock auth - maps route may not have auth yet, but adding for consistency
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;

describe('Map API', () => {
  let connection: MongoClient;
  let db: Db;
  const projectId = new ObjectId();
  const userId = 'test-user-123';

  beforeAll(async () => {
    connection = await MongoClient.connect(globalThis.__ATLAS_URI__!);
    db = await connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });
  });

  afterAll(async () => {
    await connection.close();
  });

  beforeEach(async () => {
    // Mock authenticated session
    const { auth } = require('@/auth');
    auth.mockResolvedValue({ user: { id: userId } });

    await db.collection('maps').deleteMany({});
    await db.collection('projects').deleteMany({});
  });

  it('should create a new map', async () => {
    await db.collection('projects').insertOne({
      _id: projectId,
      name: 'Test Project',
      userId,
      maps: [],
    });

    const mockRequest = {
      json: jest
        .fn()
        .mockResolvedValue({ name: 'Test Map', width: 10, height: 10 }),
    } as unknown as NextRequest;

    const params = Promise.resolve({ projectId: projectId.toHexString() });
    const response = await POST(mockRequest, { params });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id');
    expect(data.name).toBe('Test Map');
    expect(data.width).toBe(10);
    expect(data.height).toBe(10);

    const project = await db.collection('projects').findOne({ _id: projectId });
    expect(project?.maps).toHaveLength(1);
    expect(project?.maps[0]).toEqual(data.id);
  });

  it('should return a list of maps for a project', async () => {
    const map1Id = new ObjectId();
    const map2Id = new ObjectId();

    await db.collection('maps').insertMany([
      { _id: map1Id, name: 'Map 1', width: 10, height: 10 },
      { _id: map2Id, name: 'Map 2', width: 20, height: 20 },
    ]);

    await db.collection('projects').insertOne({
      _id: projectId,
      name: 'Test Project',
      userId,
      maps: [map1Id.toHexString(), map2Id.toHexString()],
    });

    const mockRequest = {} as unknown as NextRequest;
    const params = Promise.resolve({ projectId: projectId.toHexString() });

    const response = await GET(mockRequest, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe('Map 1');
    expect(data[1].name).toBe('Map 2');
  });

  it('should return 404 if project not found', async () => {
    const mockRequest = {
      json: jest
        .fn()
        .mockResolvedValue({ name: 'Test Map', width: 10, height: 10 }),
    } as unknown as NextRequest;

    const params = Promise.resolve({ projectId: new ObjectId().toHexString() });
    const response = await POST(mockRequest, { params });

    expect(response.status).toBe(404);
  });
});
