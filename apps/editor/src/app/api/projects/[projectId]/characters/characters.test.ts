import { MongoClient, Db, ObjectId } from 'mongodb';
import { POST, GET } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest } from 'next/server';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;

describe('Character API', () => {
  let connection: MongoClient;
  let db: Db;
  const projectId = new ObjectId().toHexString();

  beforeAll(async () => {
    connection = await MongoClient.connect(globalThis.__MONGO_URI__!);
    db = await connection.db(globalThis.__MONGO_DB_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });
  });

  afterAll(async () => {
    await connection.close();
  });

  beforeEach(async () => {
    await db.collection('characters').deleteMany({});
    await db.collection('projects').deleteMany({});
    await db.collection('projects').insertOne({ _id: new ObjectId(projectId), name: 'Test Project', characters: [] });
  });

  it('should create a new character', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ name: 'Hero', hp: 100, attack: 10, defense: 5 }),
    } as unknown as NextRequest;

    const params = { params: Promise.resolve({ projectId }) };
    const response = await POST(mockRequest, params);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id');
    expect(data.name).toBe('Hero');
    expect(data.hp).toBe(100);

    // Verify DB interactions
    const character = await db.collection('characters').findOne({ _id: new ObjectId(data.id) });
    expect(character).toBeTruthy();
    expect(character?.name).toBe('Hero');

    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    expect(project?.characters).toContain(data.id);
  });

  it('should return a list of characters for a project', async () => {
    const mockRequest = {} as unknown as NextRequest;
    const params = { params: Promise.resolve({ projectId }) };

    // Insert some characters
    const char1 = await db.collection('characters').insertOne({ name: 'Char 1', hp: 50 });
    const char2 = await db.collection('characters').insertOne({ name: 'Char 2', hp: 60 });

    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { characters: [char1.insertedId.toHexString(), char2.insertedId.toHexString()] } }
    );

    const response = await GET(mockRequest, params);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0]).toHaveProperty('id');
    expect(data[0].name).toBe('Char 1');
  });
});
