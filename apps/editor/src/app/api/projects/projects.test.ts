import { MongoClient, Db } from 'mongodb';
import { POST, GET } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest } from 'next/server';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
  closeDatabaseConnection: jest.fn(),
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;

describe('Project API', () => {
  let connection: MongoClient;
  let db: Db;

  beforeAll(async () => {
    connection = await MongoClient.connect(globalThis.__MONGO_URI__!);
    db = await connection.db(globalThis.__MONGO_DB_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });
  });

  afterAll(async () => {
    await connection.close();
  });

  it('should create a new project', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ name: 'Test Project' }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id');
    expect(data.name).toBe('Test Project');

    const projects = db.collection('projects');
    const insertedProject = await projects.findOne({ name: 'Test Project' });
    expect(insertedProject).not.toBeNull();
    expect(insertedProject?.name).toEqual('Test Project');
  });

  it('should return a list of projects', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('id');
    }
  });
});
