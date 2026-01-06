import { MongoClient, Db, ObjectId } from 'mongodb';
import { DELETE } from './route';
import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest } from 'next/server';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;

describe('Map Deletion API', () => {
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
  });

  it('should delete a map and remove it from the project', async () => {
    // Setup data
    const map = await db
      .collection('maps')
      .insertOne({ name: 'Map to Delete' });
    const mapId = map.insertedId.toHexString();

    const project = await db.collection('projects').insertOne({
      name: 'Project',
      maps: [mapId],
    });
    const projectId = project.insertedId.toHexString();

    const mockRequest = {} as unknown as NextRequest;
    const params = { params: Promise.resolve({ projectId, mapId }) };

    // Execute DELETE
    const response = await DELETE(mockRequest, params);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Map deleted');

    // Verify deletion
    const deletedMap = await db
      .collection('maps')
      .findOne({ _id: new ObjectId(mapId) });
    expect(deletedMap).toBeNull();

    // Verify removal from project
    const updatedProject = await db
      .collection('projects')
      .findOne({ _id: new ObjectId(projectId) });
    expect(updatedProject?.maps).not.toContain(mapId);
  });
});
