import { MongoClient, Db, ObjectId } from 'mongodb';
import { DELETE } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest } from 'next/server';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;

describe('Character Deletion API', () => {
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

  beforeEach(async () => {
    await db.collection('projects').deleteMany({});
    await db.collection('characters').deleteMany({});
  });

  it('should delete a character and remove it from the project', async () => {
    // Setup data
    const char = await db.collection('characters').insertOne({ name: 'Char to Delete' });
    const charId = char.insertedId.toHexString();
    
    const project = await db.collection('projects').insertOne({
      name: 'Project',
      characters: [charId]
    });
    const projectId = project.insertedId.toHexString();

    const mockRequest = {} as unknown as NextRequest;
    const params = { params: Promise.resolve({ projectId, characterId: charId }) };

    // Execute DELETE
    const response = await DELETE(mockRequest, params);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Character deleted');

    // Verify deletion
    const deletedChar = await db.collection('characters').findOne({ _id: new ObjectId(charId) });
    expect(deletedChar).toBeNull();

    // Verify removal from project
    const updatedProject = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    expect(updatedProject?.characters).not.toContain(charId);
  });
});
