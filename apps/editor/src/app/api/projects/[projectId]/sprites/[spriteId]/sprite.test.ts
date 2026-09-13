import { Db, MongoClient, ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/lib/apiAuth';
import { connectToDatabase } from '@/lib/mongodb';
import { createMongoClient } from '@/lib/mongoClient';
import { getTilesetStorage } from '@/lib/storage';
import { DELETE } from './route';

jest.mock('@/lib/apiAuth', () => ({
  requireProjectAccess: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  getTilesetStorage: jest.fn(),
}));

const mockedRequireProjectAccess = requireProjectAccess as jest.Mock;
const mockedConnectToDatabase = connectToDatabase as jest.Mock;
const mockedGetTilesetStorage = getTilesetStorage as jest.Mock;

describe('DELETE sprite API', () => {
  let connection: MongoClient;
  let db: Db;
  const projectObjectId = new ObjectId();
  const projectId = projectObjectId.toHexString();
  const userId = 'sprite-owner';
  let spriteObjectId: ObjectId;
  let spriteId: string;
  let mapObjectId: ObjectId;
  let characterObjectId: ObjectId;
  const deleteFile = jest.fn();

  beforeAll(async () => {
    connection = createMongoClient(globalThis.__ATLAS_URI__!);
    await connection.connect();
    db = connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await Promise.all([
      db.collection('projects').deleteMany({}),
      db.collection('maps').deleteMany({}),
      db.collection('characters').deleteMany({}),
      db.collection('sprites').deleteMany({}),
    ]);

    spriteObjectId = new ObjectId();
    spriteId = spriteObjectId.toHexString();
    mapObjectId = new ObjectId();
    characterObjectId = new ObjectId();
    const project = {
      _id: projectObjectId,
      userId,
      maps: [mapObjectId.toHexString()],
      characters: [characterObjectId.toHexString()],
      sprites: [spriteId],
    };
    await db.collection('projects').insertOne(project);
    await db.collection('sprites').insertOne({
      _id: spriteObjectId,
      projectId,
      name: 'Hero sprite',
      mimeType: 'image/png',
    });
    mockedRequireProjectAccess.mockResolvedValue({
      ok: true,
      userId,
      project,
    });
    mockedConnectToDatabase.mockResolvedValue({ db });
    deleteFile.mockResolvedValue(undefined);
    mockedGetTilesetStorage.mockReturnValue({ deleteFile });
  });

  afterAll(async () => {
    await connection.close();
  });

  async function deleteSprite() {
    return DELETE({} as NextRequest, {
      params: Promise.resolve({ projectId, spriteId }),
    });
  }

  it.each([
    ['entity', true, false],
    ['character', false, true],
  ])('returns 409 while a %s references the sprite', async (_type, withEntity, withCharacter) => {
    await db.collection('maps').insertOne({
      _id: mapObjectId,
      name: 'Main map',
      entities: withEntity
        ? [{ id: 'entity-1', name: 'Hero entity', spriteId }]
        : [],
    });
    await db.collection('characters').insertOne({
      _id: characterObjectId,
      name: 'Hero character',
      spriteId: withCharacter ? spriteId : '',
    });

    const response = await deleteSprite();
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data).toMatchObject({
      kind: 'charset',
      id: spriteId,
      usages: [
        withEntity
          ? {
            type: 'entity',
            id: 'entity-1',
            name: 'Hero entity',
            mapId: mapObjectId.toHexString(),
          }
          : {
            type: 'character',
            id: characterObjectId.toHexString(),
            name: 'Hero character',
          },
      ],
    });
    expect(deleteFile).not.toHaveBeenCalled();
    await expect(
      db.collection('sprites').findOne({ _id: spriteObjectId }),
    ).resolves.not.toBeNull();
  });

  it('returns 204 and deletes an unused sprite', async () => {
    const response = await deleteSprite();

    expect(response.status).toBe(204);
    expect(deleteFile).toHaveBeenCalledTimes(1);
    await expect(
      db.collection('sprites').findOne({ _id: spriteObjectId }),
    ).resolves.toBeNull();
    const project = await db.collection('projects').findOne({ _id: projectObjectId });
    expect(project?.sprites).not.toContain(spriteId);
  });
});
