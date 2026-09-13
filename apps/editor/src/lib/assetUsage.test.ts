import { Db, MongoClient, ObjectId } from 'mongodb';
import { createMongoClient } from '@/lib/mongoClient';
import { collectAssetUsages } from './assetUsage';

describe('collectAssetUsages', () => {
  let connection: MongoClient;
  let db: Db;

  beforeAll(async () => {
    connection = createMongoClient(globalThis.__ATLAS_URI__!);
    await connection.connect();
    db = connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
  });

  beforeEach(async () => {
    await db.collection('maps').deleteMany({});
    await db.collection('characters').deleteMany({});
  });

  afterAll(async () => {
    await connection.close();
  });

  it('finds tileset references only on maps registered to the project', async () => {
    const registeredMapId = new ObjectId();
    const otherProjectMapId = new ObjectId();
    await db.collection('maps').insertMany([
      { _id: registeredMapId, name: 'Registered', tilesetId: 'ts1', entities: [] },
      { _id: otherProjectMapId, name: 'Other project', tilesetId: 'ts1', entities: [] },
    ]);

    const usages = await collectAssetUsages(
      db,
      { maps: [registeredMapId.toHexString()], characters: [] },
      'tileset',
      'ts1',
    );

    expect(usages).toEqual([
      { type: 'map', id: registeredMapId.toHexString(), name: 'Registered' },
    ]);
  });

  it('finds charset references in registered map entities and characters', async () => {
    const mapId = new ObjectId();
    const characterId = new ObjectId();
    await db.collection('maps').insertMany([
      {
        _id: mapId,
        name: 'Village',
        tilesetId: 'ts1',
        entities: [
          { id: 'entity-1', name: 'Guide', spriteId: 'sprite-1' },
          { id: 'entity-2', name: 'No sprite', spriteId: '' },
        ],
      },
      {
        _id: new ObjectId(),
        name: 'Other project',
        tilesetId: 'ts1',
        entities: [{ id: 'other-entity', name: 'Other', spriteId: 'sprite-1' }],
      },
    ]);
    await db.collection('characters').insertMany([
      {
        _id: characterId,
        name: 'Hero template',
        spriteId: 'sprite-1',
      },
      {
        _id: new ObjectId(),
        name: 'Other project character',
        spriteId: 'sprite-1',
      },
    ]);

    const usages = await collectAssetUsages(
      db,
      {
        maps: [mapId.toHexString()],
        characters: [characterId.toHexString()],
      },
      'charset',
      'sprite-1',
    );

    expect(usages).toEqual([
      {
        type: 'entity',
        id: 'entity-1',
        name: 'Guide',
        mapId: mapId.toHexString(),
      },
      {
        type: 'character',
        id: characterId.toHexString(),
        name: 'Hero template',
      },
    ]);
  });

  it('ignores empty asset ids', async () => {
    const mapId = new ObjectId();
    const characterId = new ObjectId();
    await db.collection('maps').insertOne({
      _id: mapId,
      name: 'Empty references',
      tilesetId: '',
      entities: [{ id: 'entity-1', name: 'Empty', spriteId: '' }],
    });
    await db.collection('characters').insertOne({
      _id: characterId,
      name: 'Empty',
      spriteId: '',
    });

    await expect(
      collectAssetUsages(
        db,
        { maps: [mapId.toHexString()], characters: [characterId.toHexString()] },
        'charset',
        '',
      ),
    ).resolves.toEqual([]);
  });

  it('deduplicates usages and sorts maps, entities, then characters stably', async () => {
    const alphaMapId = new ObjectId();
    const betaMapId = new ObjectId();
    const alphaCharacterId = new ObjectId();
    const betaCharacterId = new ObjectId();
    await db.collection('maps').insertMany([
      {
        _id: betaMapId,
        name: 'Beta',
        tilesetId: 'sprite-1',
        entities: [
          { id: 'entity-z', name: 'Zulu', spriteId: 'sprite-1' },
          { id: 'entity-z', name: 'Zulu duplicate', spriteId: 'sprite-1' },
        ],
      },
      {
        _id: alphaMapId,
        name: 'Alpha',
        tilesetId: 'sprite-1',
        entities: [{ id: 'entity-z', name: 'Alpha entity', spriteId: 'sprite-1' }],
      },
    ]);
    await db.collection('characters').insertMany([
      { _id: betaCharacterId, name: 'Beta character', spriteId: 'sprite-1' },
      { _id: alphaCharacterId, name: 'Alpha character', spriteId: 'sprite-1' },
    ]);

    const project = {
      maps: [
        betaMapId.toHexString(),
        alphaMapId.toHexString(),
        betaMapId.toHexString(),
      ],
      characters: [
        betaCharacterId.toHexString(),
        alphaCharacterId.toHexString(),
        betaCharacterId.toHexString(),
      ],
    };

    const tilesetUsages = await collectAssetUsages(db, project, 'tileset', 'sprite-1');
    expect(tilesetUsages.map(({ name }) => name)).toEqual(['Alpha', 'Beta']);

    const charsetUsages = await collectAssetUsages(db, project, 'charset', 'sprite-1');
    expect(charsetUsages.map(({ name }) => name)).toEqual([
      'Alpha entity',
      'Zulu',
      'Alpha character',
      'Beta character',
    ]);
  });
});
