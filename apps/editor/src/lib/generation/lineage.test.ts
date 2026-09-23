import { Db, MongoClient, ObjectId } from 'mongodb';

import { createMongoClient } from '@/lib/mongoClient';

import {
  findDependents,
  markDependentsStale,
} from './lineage';

describe('generation lineage', () => {
  let connection: MongoClient;
  let db: Db;
  const projectId = new ObjectId().toHexString();
  const otherProjectId = new ObjectId().toHexString();

  beforeAll(async () => {
    connection = createMongoClient(globalThis.__ATLAS_URI__!);
    await connection.connect();
    db = connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
  });

  beforeEach(async () => {
    await db.collection('tilesets').deleteMany({});
  });

  afterAll(async () => {
    await connection.close();
  });

  it('returns only direct same-project dependents', async () => {
    const familyId = new ObjectId();
    const childId = new ObjectId();
    const grandchildId = new ObjectId();
    const foreignId = new ObjectId();
    await db.collection('tilesets').insertMany([
      {
        _id: familyId,
        projectId,
        generation_metadata: { generated: true, role: 'family', label: 'grass' },
      },
      {
        _id: childId,
        projectId,
        generation_metadata: {
          generated: true,
          role: 'transition',
          label: 'grass ↔ dirt',
          status: 'fresh',
          sourceFamilyIds: [familyId.toHexString()],
          pairFamilyIds: [familyId.toHexString(), new ObjectId().toHexString()],
        },
      },
      {
        _id: grandchildId,
        projectId,
        generation_metadata: {
          generated: true,
          role: 'family',
          sourceFamilyIds: [childId.toHexString()],
        },
      },
      {
        _id: foreignId,
        projectId: otherProjectId,
        generation_metadata: {
          generated: true,
          role: 'family',
          sourceFamilyIds: [familyId.toHexString()],
        },
      },
    ]);

    await expect(findDependents(db, projectId, familyId.toHexString())).resolves.toEqual([
      {
        id: childId.toHexString(),
        name: 'grass ↔ dirt',
        role: 'transition',
        status: 'fresh',
      },
    ]);
  });

  it('marks only those direct dependents stale', async () => {
    const familyId = new ObjectId();
    const childId = new ObjectId();
    await db.collection('tilesets').insertMany([
      {
        _id: familyId,
        projectId,
        generation_metadata: { generated: true, role: 'family', status: 'fresh' },
      },
      {
        _id: childId,
        projectId,
        generation_metadata: {
          generated: true,
          role: 'family',
          status: 'fresh',
          sourceFamilyIds: [familyId.toHexString()],
        },
      },
    ]);

    await expect(markDependentsStale(db, projectId, familyId.toHexString())).resolves.toEqual([
      childId.toHexString(),
    ]);
    expect(await db.collection('tilesets').findOne({ _id: childId })).toMatchObject({
      generation_metadata: { status: 'stale' },
    });
    expect(await db.collection('tilesets').findOne({ _id: familyId })).toMatchObject({
      generation_metadata: { status: 'fresh' },
    });
  });
});
