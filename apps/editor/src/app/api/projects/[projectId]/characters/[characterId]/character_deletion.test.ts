import { MongoClient, Db, ObjectId } from 'mongodb';
import { DELETE } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { createMongoClient } from '@/lib/mongoClient';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
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
const mockedGetSession = auth.api.getSession as unknown as jest.Mock;

describe('Character Deletion API', () => {
  let connection: MongoClient;
  let db: Db;
  const userId = 'test-user-123';

  beforeAll(async () => {
    connection = createMongoClient(globalThis.__ATLAS_URI__!);
    await connection.connect();
    db = connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });
  });

  afterAll(async () => {
    await connection.close();
  });

  beforeEach(async () => {
    mockedGetSession.mockResolvedValue({ user: { id: userId } });

    await db.collection('projects').deleteMany({});
    await db.collection('characters').deleteMany({});
  });

  it('should delete a character and remove it from the project', async () => {
    // Setup data
    const char = await db
      .collection('characters')
      .insertOne({ name: 'Char to Delete' });
    const charId = char.insertedId.toHexString();

    const project = await db.collection('projects').insertOne({
      name: 'Project',
      userId,
      characters: [charId],
    });
    const projectId = project.insertedId.toHexString();

    const mockRequest = {} as unknown as NextRequest;
    const params = {
      params: Promise.resolve({ projectId, characterId: charId }),
    };

    // Execute DELETE
    const response = await DELETE(mockRequest, params);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Character deleted');

    // Verify deletion
    const deletedChar = await db
      .collection('characters')
      .findOne({ _id: new ObjectId(charId) });
    expect(deletedChar).toBeNull();

    // Verify removal from project
    const updatedProject = await db
      .collection('projects')
      .findOne({ _id: new ObjectId(projectId) });
    expect(updatedProject?.characters).not.toContain(charId);
  });
});
