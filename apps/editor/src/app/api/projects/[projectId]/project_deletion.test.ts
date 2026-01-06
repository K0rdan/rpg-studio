import { MongoClient, Db, ObjectId } from 'mongodb';
import { DELETE } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest } from 'next/server';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;

describe('Project Deletion API', () => {
  let connection: MongoClient;
  let db: Db;

  beforeAll(async () => {
    connection = await MongoClient.connect(globalThis.__ATLAS_URI__!);
    db = await connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });
  });

  afterAll(async () => {
    await connection.close();
  });

  beforeEach(async () => {
    await db.collection('projects').deleteMany({});
    await db.collection('maps').deleteMany({});
    await db.collection('characters').deleteMany({});
  });

  it('should delete a project and its associated resources', async () => {
    // Setup data
    const map1 = await db.collection('maps').insertOne({ name: 'Map 1' });
    const char1 = await db
      .collection('characters')
      .insertOne({ name: 'Char 1' });

    const project = await db.collection('projects').insertOne({
      name: 'Project to Delete',
      maps: [map1.insertedId.toHexString()],
      characters: [char1.insertedId.toHexString()],
    });
    const projectId = project.insertedId.toHexString();

    const mockRequest = {} as unknown as NextRequest;
    const params = { params: Promise.resolve({ projectId }) };

    // Execute DELETE
    const response = await DELETE(mockRequest, params);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Project deleted');

    // Verify deletion
    const deletedProject = await db
      .collection('projects')
      .findOne({ _id: new ObjectId(projectId) });
    expect(deletedProject).toBeNull();

    const deletedMap = await db
      .collection('maps')
      .findOne({ _id: map1.insertedId });
    expect(deletedMap).toBeNull();

    const deletedChar = await db
      .collection('characters')
      .findOne({ _id: char1.insertedId });
    expect(deletedChar).toBeNull();
  });
});
