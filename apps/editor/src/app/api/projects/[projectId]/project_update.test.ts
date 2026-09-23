import { Db, MongoClient, ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { createMongoClient } from '@/lib/mongoClient';
import { connectToDatabase } from '@/lib/mongodb';

import { PATCH } from './route';

jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}));
jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}));
jest.mock('@/lib/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;
const mockedGetSession = auth.api.getSession as unknown as jest.Mock;

describe('PATCH project style', () => {
  let connection: MongoClient;
  let db: Db;
  let projectId: string;

  beforeAll(async () => {
    connection = createMongoClient(globalThis.__ATLAS_URI__!);
    await connection.connect();
    db = connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });
  });

  beforeEach(async () => {
    projectId = new ObjectId().toHexString();
    mockedGetSession.mockResolvedValue({ user: { id: 'owner' } });
    await db.collection('projects').deleteMany({});
    await db.collection('tilesets').deleteMany({});
    await db.collection('projects').insertOne({
      _id: new ObjectId(projectId),
      name: 'Project',
      userId: 'owner',
      maps: [],
      characters: [],
      tilesets: [],
    });
  });

  afterAll(async () => {
    await connection.close();
  });

  const request = (body: unknown) => ({
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as NextRequest;

  it('persists a valid style and trims or omits mood', async () => {
    const response = await PATCH(request({
      styleSpec: { tileSize: 32, perspective: 'top-down', mood: ' warm autumn ' },
    }), { params: Promise.resolve({ projectId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.styleSpec).toEqual({
      tileSize: 32,
      perspective: 'top-down',
      mood: 'warm autumn',
    });

    const clearMood = await PATCH(request({
      styleSpec: { tileSize: 32, perspective: 'top-down', mood: '   ' },
    }), { params: Promise.resolve({ projectId }) });
    await expect(clearMood.json()).resolves.toMatchObject({
      styleSpec: { tileSize: 32, perspective: 'top-down' },
    });
  });

  it.each([
    {},
    { styleSpec: { tileSize: 24, perspective: 'top-down' } },
    { styleSpec: { tileSize: 32, perspective: 'side' } },
    { styleSpec: { tileSize: 32, perspective: 'top-down', mood: 'x'.repeat(201) } },
  ])('rejects unsupported or invalid payload %#', async (body) => {
    const response = await PATCH(request(body), {
      params: Promise.resolve({ projectId }),
    });
    expect(response.status).toBe(400);
  });

  it('requires confirmation for a dimensional change after an accepted family', async () => {
    const familyId = new ObjectId();
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          styleSpec: { tileSize: 16, perspective: 'top-down' },
          tilesets: [familyId.toHexString()],
        },
      },
    );
    await db.collection('tilesets').insertOne({
      _id: familyId,
      projectId,
      generation_metadata: { generated: true, role: 'family' },
    });

    const refused = await PATCH(request({
      styleSpec: { tileSize: 32, perspective: '3/4' },
    }), { params: Promise.resolve({ projectId }) });
    expect(refused.status).toBe(409);

    const confirmed = await PATCH(request({
      styleSpec: { tileSize: 32, perspective: '3/4' },
      confirmStyleChange: true,
    }), { params: Promise.resolve({ projectId }) });
    expect(confirmed.status).toBe(200);
  });

  it('persists, defaults, and clears an optional generationModel', async () => {
    const saved = await PATCH(request({
      generationModel: 'gpt',
    }), { params: Promise.resolve({ projectId }) });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ generationModel: 'gpt' });

    const invalid = await PATCH(request({
      generationModel: 'midjourney',
    }), { params: Promise.resolve({ projectId }) });
    expect(invalid.status).toBe(400);

    const cleared = await PATCH(request({
      generationModel: null,
    }), { params: Promise.resolve({ projectId }) });
    expect(cleared.status).toBe(200);
    expect(await db.collection('projects').findOne({ _id: new ObjectId(projectId) })).not.toHaveProperty('generationModel');
  });
});
