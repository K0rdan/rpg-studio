import { Db, MongoClient, ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { createMongoClient } from '@/lib/mongoClient';
import { GET } from './route';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
  closeDatabaseConnection: jest.fn(),
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

describe('GET asset usage API', () => {
  let connection: MongoClient;
  let db: Db;
  const userId = 'usage-user';
  const projectId = new ObjectId().toHexString();
  let mapId: string;
  let characterId: string;
  let tilesetId: string;
  let spriteId: string;
  let unusedSpriteId: string;

  beforeAll(async () => {
    connection = createMongoClient(globalThis.__ATLAS_URI__!);
    await connection.connect();
    db = connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedConnectToDatabase.mockResolvedValue({ db });
    mockedGetSession.mockResolvedValue({ user: { id: userId } });
    await Promise.all([
      db.collection('projects').deleteMany({}),
      db.collection('maps').deleteMany({}),
      db.collection('characters').deleteMany({}),
      db.collection('tilesets').deleteMany({}),
      db.collection('sprites').deleteMany({}),
    ]);

    const mapObjectId = new ObjectId();
    const characterObjectId = new ObjectId();
    const tilesetObjectId = new ObjectId();
    const spriteObjectId = new ObjectId();
    const unusedSpriteObjectId = new ObjectId();
    mapId = mapObjectId.toHexString();
    characterId = characterObjectId.toHexString();
    tilesetId = tilesetObjectId.toHexString();
    spriteId = spriteObjectId.toHexString();
    unusedSpriteId = unusedSpriteObjectId.toHexString();

    await db.collection('projects').insertOne({
      _id: new ObjectId(projectId),
      userId,
      maps: [mapId],
      characters: [characterId],
      tilesets: [tilesetId],
      sprites: [spriteId, unusedSpriteId],
    });
    await db.collection('maps').insertOne({
      _id: mapObjectId,
      name: 'Main map',
      tilesetId,
      entities: [{ id: 'entity-1', name: 'Hero', spriteId }],
    });
    await db.collection('characters').insertOne({
      _id: characterObjectId,
      name: 'Hero template',
      spriteId,
    });
    await db.collection('tilesets').insertOne({
      _id: tilesetObjectId,
      projectId,
      name: 'Project tileset',
    });
    await db.collection('sprites').insertMany([
      { _id: spriteObjectId, projectId, name: 'Hero' },
      { _id: unusedSpriteObjectId, projectId, name: 'Unused' },
    ]);
  });

  afterAll(async () => {
    await connection.close();
  });

  function request(kind: string, assetId: string) {
    return GET({} as NextRequest, {
      params: Promise.resolve({ projectId, kind, assetId }),
    });
  }

  it('requires authentication', async () => {
    mockedGetSession.mockResolvedValueOnce(null);

    const response = await request('tileset', tilesetId);

    expect(response.status).toBe(401);
  });

  it('requires access to the requested project', async () => {
    mockedGetSession.mockResolvedValueOnce({ user: { id: 'another-user' } });

    const response = await request('tileset', tilesetId);

    expect(response.status).toBe(403);
  });

  it('returns 400 for an unsupported asset kind', async () => {
    const response = await request('sound', 'sound-1');

    expect(response.status).toBe(400);
  });

  it('returns 404 for an asset not registered on the project', async () => {
    const unregisteredSpriteId = new ObjectId();
    await db.collection('sprites').insertOne({
      _id: unregisteredSpriteId,
      projectId: 'another-project',
      name: 'Unknown here',
    });

    const response = await request('charset', unregisteredSpriteId.toHexString());

    expect(response.status).toBe(404);
  });

  it('returns 200 with an empty list for an unused registered asset', async () => {
    const response = await request('charset', unusedSpriteId);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      kind: 'charset',
      id: unusedSpriteId,
      usages: [],
    });
  });

  it('lists project-scoped maps using a project tileset', async () => {
    const response = await request('tileset', tilesetId);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      kind: 'tileset',
      id: tilesetId,
      origin: 'project',
      usages: [{ type: 'map', id: mapId, name: 'Main map' }],
    });
  });

  it('lists entity and character usages for a charset', async () => {
    const response = await request('charset', spriteId);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      kind: 'charset',
      id: spriteId,
      usages: [
        { type: 'entity', id: 'entity-1', name: 'Hero', mapId },
        { type: 'character', id: characterId, name: 'Hero template' },
      ],
    });
  });

  it('lists maps using a registry tileset', async () => {
    await db.collection('maps').updateOne(
      { _id: new ObjectId(mapId) },
      { $set: { tilesetId: 'ts1' } },
    );

    const response = await request('tileset', 'ts1');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      kind: 'tileset',
      id: 'ts1',
      origin: 'registry',
      usages: [{ type: 'map', id: mapId, name: 'Main map' }],
    });
  });

  it('excludes maps that are not registered on the project', async () => {
    await db.collection('maps').insertOne({
      _id: new ObjectId(),
      name: 'Other project map',
      tilesetId,
      entities: [],
    });

    const response = await request('tileset', tilesetId);
    const data = await response.json();

    expect(data.usages).toEqual([{ type: 'map', id: mapId, name: 'Main map' }]);
  });
});
