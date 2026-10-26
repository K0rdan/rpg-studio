import { Db, MongoClient, ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import {
  GenerationUnavailableError,
  getGenerationClient,
} from '@/lib/generation/generationClient';
import { postProcessGeneratedImage } from '@/lib/generation/postProcessor';
import { createTileSheetPng } from '@/lib/generation/__tests__/imageFixtures';
import { createMongoClient } from '@/lib/mongoClient';
import { connectToDatabase } from '@/lib/mongodb';
import { getTilesetStorage } from '@/lib/storage';

import { POST as generate } from './generate/route';
import { POST as saveGenerated } from './save-generated/route';

jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}));
jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}));
jest.mock('@/lib/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock('@/lib/storage', () => ({
  getTilesetStorage: jest.fn(),
}));
jest.mock('@/lib/generation/generationClient', () => {
  const actual = jest.requireActual('@/lib/generation/generationClient') as typeof import('@/lib/generation/generationClient');
  return {
    ...actual,
    getGenerationClient: jest.fn(),
  };
});
jest.mock('@/lib/generation/postProcessor', () => {
  const actual = jest.requireActual('@/lib/generation/postProcessor') as typeof import('@/lib/generation/postProcessor');
  return {
    ...actual,
    postProcessTileSheet: jest.fn(),
    postProcessGeneratedImage: jest.fn(),
  };
});

const mockedConnectToDatabase = connectToDatabase as jest.Mock;
const mockedGetSession = auth.api.getSession as unknown as jest.Mock;
const mockedGetGenerationClient = getGenerationClient as jest.Mock;
const mockedPostProcess = postProcessGeneratedImage as jest.Mock;
const mockedGetStorage = getTilesetStorage as jest.Mock;

describe('US1 tileset generation routes', () => {
  let connection: MongoClient;
  let db: Db;
  let projectId: string;
  let png: Buffer;
  const uploadTilesetImage = jest.fn();
  const downloadFile = jest.fn();
  const generateImage = jest.fn();

  beforeAll(async () => {
    connection = createMongoClient(globalThis.__ATLAS_URI__!);
    await connection.connect();
    db = connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });
    png = await createTileSheetPng(32);
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
      styleSpec: { tileSize: 32, perspective: 'top-down' },
    });

    generateImage.mockReset().mockResolvedValue({
      mimeType: 'image/png',
      bytes: new Uint8Array(png),
      model: 'gemini',
    });
    mockedGetGenerationClient.mockReset().mockReturnValue({
      model: 'gemini',
      isAvailable: () => true,
      generate: generateImage,
    });
    mockedPostProcess.mockReset().mockResolvedValue({
      mimeType: 'image/png',
      bytes: new Uint8Array(png),
      generationMode: 'texture',
      tilingMode: 'individual',
      selfTilingScore: 1,
    });
    uploadTilesetImage.mockReset().mockResolvedValue({ storageKey: 'generated.png' });
    downloadFile.mockReset().mockResolvedValue({ data: png, mimeType: 'image/png' });
    mockedGetStorage.mockReturnValue({ uploadTilesetImage, downloadFile });
  });

  afterAll(async () => {
    await connection.close();
  });

  const request = (body: unknown) => {
    const payload = body as Record<string, unknown>;
    const normalized = { ...payload };
    // Keep older route scenarios concise while the new contract separates asset
    // naming from the functional generation description.
    if (typeof normalized.label === 'string') {
      normalized.name ??= normalized.label.trim();
      normalized.subjectDescription ??= normalized.label.trim();
    }
    return {
      json: jest.fn().mockResolvedValue(normalized),
    } as unknown as NextRequest;
  };
  const params = () => ({ params: Promise.resolve({ projectId }) });

  it('refuses generation without a saved style or with a custom prompt', async () => {
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $unset: { styleSpec: '' } },
    );
    expect((await generate(request({
      stage: 'base',
      category: 'vegetation',
      label: 'grass',
      generationMode: 'texture',
    }), params())).status).toBe(400);

    expect((await generate(request({
      stage: 'base',
      category: 'vegetation',
      label: 'grass',
      custom_prompt: 'bypass',
    }), params())).status).toBe(400);
  });

  it('returns a processed first-family preview without blob or Mongo persistence', async () => {
    const response = await generate(request({
      stage: 'base',
      category: 'vegetation',
      name: 'grass-ground',
      subjectDescription: 'short green grass',
      generationMode: 'texture',
    }), params());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.preview_data).toMatch(/^data:image\/png;base64,/);
    expect(data.generation_params).toMatchObject({
      stage: 'base',
      category: 'vegetation',
      name: 'grass-ground',
      subjectDescription: 'short green grass',
      generationMode: 'texture',
      tilingMode: 'individual',
      tile_width: 32,
      tile_height: 32,
      model: 'gemini',
      sourceFamilyIds: [],
    });
    expect(generateImage).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini',
      referenceImages: [],
      tileSize: 32,
    }));
    const sentPrompt = generateImage.mock.calls[0][0].prompt as string;
    expect(sentPrompt).toContain('short green grass');
    expect(sentPrompt).not.toContain('grass-ground');
    expect(sentPrompt).not.toContain('vegetation');
    expect(mockedPostProcess).toHaveBeenCalledWith(expect.anything(), 32, 'texture');
    expect(uploadTilesetImage).not.toHaveBeenCalled();
    expect(await db.collection('tilesets').countDocuments()).toBe(0);
  });

  it('honors a requested tilingMode and refuses an invalid one before generate', async () => {
    mockedPostProcess.mockResolvedValueOnce({
      mimeType: 'image/png',
      bytes: new Uint8Array(png),
      generationMode: 'texture',
      tilingMode: 'individual',
      selfTilingScore: 1,
    });
    const honored = await generate(request({
      stage: 'base',
      category: 'vegetation',
      label: 'grass',
      generationMode: 'texture',
      tilingMode: 'fixed-block',
    }), params());
    expect(honored.status).toBe(200);
    expect((await honored.json()).generation_params.tilingMode).toBe('fixed-block');

    const rejected = await generate(request({
      stage: 'base',
      category: 'vegetation',
      label: 'meadow',
      generationMode: 'texture',
      tilingMode: 'wraparound',
    }), params());
    expect(rejected.status).toBe(400);
    expect(generateImage).toHaveBeenCalledTimes(1);
  });

  it('refuses a creator-choice category without generationMode and a conflicting implied mode', async () => {
    expect((await generate(request({
      stage: 'base',
      category: 'vegetation',
      label: 'grass',
    }), params())).status).toBe(400);
    expect((await generate(request({
      stage: 'base',
      category: 'ground',
      label: 'dirt',
      generationMode: 'prop',
    }), params())).status).toBe(400);
  });

  it('requires a functional generation description even when asset metadata is supplied', async () => {
    const response = await generate(request({
      stage: 'base',
      name: 'ground-01',
      category: 'vegetation',
      generationMode: 'texture',
    }), params());

    expect(response.status).toBe(400);
    expect(generateImage).not.toHaveBeenCalled();
  });

  it('post-processes accepted data again and persists fresh first-family metadata', async () => {
    const imageData = `data:image/png;base64,${png.toString('base64')}`;
    const response = await saveGenerated(request({
      name: 'grass',
      tile_width: 32,
      tile_height: 32,
      image_data: imageData,
      folderPath: 'Terrain',
      category: 'vegetation',
      label: 'grass',
      generationMode: 'texture',
      role: 'family',
      sourceFamilyIds: [],
      model: 'gemini',
      prompt: 'structured prompt',
    }), params());
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockedPostProcess).toHaveBeenCalledWith(expect.any(Uint8Array), 32, 'texture');
    expect(uploadTilesetImage).toHaveBeenCalledWith(expect.objectContaining({
      data: png,
      projectId,
    }));
    expect(data.generation_metadata).toMatchObject({
      generated: true,
      role: 'family',
      category: 'vegetation',
      generationDescription: 'grass',
      generationMode: 'texture',
      tilingMode: 'individual',
      status: 'fresh',
      sourceFamilyIds: [],
      model: 'gemini',
    });
  });

  it('persists a requested tilingMode instead of the recomputed fallback', async () => {
    mockedPostProcess.mockResolvedValueOnce({
      mimeType: 'image/png',
      bytes: new Uint8Array(png),
      generationMode: 'texture',
      tilingMode: 'individual',
      selfTilingScore: 1,
    });
    const response = await saveGenerated(request({
      name: 'grass',
      tile_width: 32,
      tile_height: 32,
      image_data: `data:image/png;base64,${png.toString('base64')}`,
      category: 'vegetation',
      label: 'stamp-grass',
      generationMode: 'texture',
      tilingMode: 'fixed-block',
      role: 'family',
      sourceFamilyIds: [],
      model: 'gemini',
      prompt: 'structured prompt',
    }), params());
    expect(response.status).toBe(201);
    expect((await response.json()).generation_metadata.tilingMode).toBe('fixed-block');
  });

  it('allows duplicate organizational names and categories for distinct described materials', async () => {
    await db.collection('tilesets').insertOne({
      _id: new ObjectId(),
      projectId,
      generation_metadata: {
        generated: true,
        role: 'family',
        category: 'vegetation',
        label: 'Grass',
      },
      name: 'grass',
    });
    const response = await saveGenerated(request({
      name: 'grass',
      tile_width: 32,
      tile_height: 32,
      image_data: `data:image/png;base64,${png.toString('base64')}`,
      category: 'vegetation',
      label: ' grass ',
      subjectDescription: 'lush grass',
      role: 'family',
      sourceFamilyIds: [],
      model: 'gemini',
      prompt: 'structured prompt',
    }), params());

    expect(response.status).toBe(201);
    expect(uploadTilesetImage).toHaveBeenCalledTimes(1);
  });

  it('refuses a later family without an accepted reference family', async () => {
    const response = await generate(request({
      stage: 'family',
      category: 'ground',
      label: 'dirt',
    }), params());
    expect(response.status).toBe(409);
    expect(generateImage).not.toHaveBeenCalled();
  });

  it('anchors a later family on the most recently accepted family image', async () => {
    const olderId = new ObjectId();
    const recentId = new ObjectId();
    await db.collection('tilesets').insertMany([
      {
        _id: olderId,
        projectId,
        name: 'older',
        storageLocation: 'older.png',
        generation_metadata: {
          generated: true,
          role: 'family',
          category: 'vegetation',
          label: 'grass',
          generated_at: new Date('2026-01-01'),
        },
      },
      {
        _id: recentId,
        projectId,
        name: 'recent',
        storageLocation: 'recent.png',
        generation_metadata: {
          generated: true,
          role: 'family',
          category: 'water',
          label: 'lake',
          generated_at: new Date('2026-02-01'),
        },
      },
    ]);

    const preview = await generate(request({
      stage: 'family',
      category: 'ground',
      label: 'dirt',
    }), params());
    const previewData = await preview.json();

    expect(preview.status).toBe(200);
    expect(downloadFile).toHaveBeenCalledWith('recent.png');
    expect(generateImage).toHaveBeenCalledWith(expect.objectContaining({
      referenceImages: [expect.objectContaining({
        tilesetId: recentId.toHexString(),
      })],
    }));
    expect(previewData.generation_params.sourceFamilyIds).toEqual([recentId.toHexString()]);
    expect(await db.collection('tilesets').countDocuments()).toBe(2);

    const saved = await saveGenerated(request({
      name: 'dirt',
      tile_width: 32,
      tile_height: 32,
      image_data: `data:image/png;base64,${png.toString('base64')}`,
      category: 'ground',
      label: 'dirt',
      role: 'family',
      sourceFamilyIds: [recentId.toHexString()],
      model: 'gemini',
      prompt: 'structured prompt',
    }), params());
    const savedData = await saved.json();
    expect(saved.status).toBe(201);
    expect(savedData.generation_metadata.sourceFamilyIds).toEqual([recentId.toHexString()]);
  });

  it('refuses transitions until two families exist and then persists a unique pair', async () => {
    const grassId = new ObjectId();
    await db.collection('tilesets').insertOne({
      _id: grassId,
      projectId,
      storageLocation: 'grass.png',
      generation_metadata: {
        generated: true,
        role: 'family',
        category: 'vegetation',
        label: 'grass',
      },
    });
    expect((await generate(request({
      stage: 'transition',
      name: 'grass-transition',
      pairFamilyIds: [grassId.toHexString(), new ObjectId().toHexString()],
    }), params())).status).toBe(409);

    const dirtId = new ObjectId();
    await db.collection('tilesets').insertOne({
      _id: dirtId,
      projectId,
      storageLocation: 'dirt.png',
      generation_metadata: {
        generated: true,
        role: 'family',
        category: 'ground',
        label: 'dirt',
      },
    });

    const preview = await generate(request({
      stage: 'transition',
      name: 'grass-dirt-transition',
      pairFamilyIds: [dirtId.toHexString(), grassId.toHexString()],
    }), params());
    const previewData = await preview.json();
    expect(preview.status).toBe(200);
    expect(previewData.generation_params.pairFamilyIds).toEqual([
      grassId.toHexString() < dirtId.toHexString()
        ? grassId.toHexString()
        : dirtId.toHexString(),
      grassId.toHexString() < dirtId.toHexString()
        ? dirtId.toHexString()
        : grassId.toHexString(),
    ]);
    expect(generateImage.mock.calls[0][0].referenceImages).toHaveLength(2);

    const saved = await saveGenerated(request({
      name: 'grass ↔ dirt',
      tile_width: 32,
      tile_height: 32,
      image_data: `data:image/png;base64,${png.toString('base64')}`,
      role: 'transition',
      pairFamilyIds: [dirtId.toHexString(), grassId.toHexString()],
      sourceFamilyIds: [dirtId.toHexString(), grassId.toHexString()],
      model: 'gemini',
      prompt: 'structured prompt',
    }), params());
    const savedData = await saved.json();
    expect(saved.status).toBe(201);
    expect(savedData.generation_metadata.role).toBe('transition');
    expect(savedData.generation_metadata.status).toBe('fresh');
    expect(savedData.generation_metadata.pairFamilyIds).toHaveLength(2);

    expect((await saveGenerated(request({
      name: 'grass ↔ dirt',
      tile_width: 32,
      tile_height: 32,
      image_data: `data:image/png;base64,${png.toString('base64')}`,
      role: 'transition',
      pairFamilyIds: [grassId.toHexString(), dirtId.toHexString()],
      sourceFamilyIds: [grassId.toHexString(), dirtId.toHexString()],
      model: 'gemini',
      prompt: 'structured prompt',
    }), params())).status).toBe(409);
  });

  it('regenerates the same family id, marks direct dependents stale, and leaves their bytes', async () => {
    const familyId = new ObjectId();
    const transitionId = new ObjectId();
    const otherFamilyId = new ObjectId();
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { tilesets: [familyId.toHexString(), otherFamilyId.toHexString(), transitionId.toHexString()] } },
    );
    await db.collection('tilesets').insertMany([
      {
        _id: familyId,
        projectId,
        name: 'grass',
        storageLocation: 'grass-old.png',
        generation_metadata: {
          generated: true,
          role: 'family',
          category: 'vegetation',
          label: 'grass',
          status: 'fresh',
          sourceFamilyIds: [],
        },
      },
      {
        _id: otherFamilyId,
        projectId,
        name: 'dirt',
        storageLocation: 'dirt.png',
        generation_metadata: {
          generated: true,
          role: 'family',
          category: 'ground',
          label: 'dirt',
          status: 'fresh',
          sourceFamilyIds: [familyId.toHexString()],
        },
      },
      {
        _id: transitionId,
        projectId,
        name: 'grass ↔ dirt',
        storageLocation: 'transition-old.png',
        generation_metadata: {
          generated: true,
          role: 'transition',
          status: 'fresh',
          sourceFamilyIds: [familyId.toHexString(), otherFamilyId.toHexString()],
          pairFamilyIds: [familyId.toHexString(), otherFamilyId.toHexString()].sort(),
        },
      },
    ]);

    const preview = await generate(request({
      stage: 'base',
      category: 'vegetation',
      label: 'grass',
      generationMode: 'texture',
      regenerateTilesetId: familyId.toHexString(),
    }), params());
    expect(preview.status).toBe(200);
    expect(await db.collection('tilesets').findOne({ _id: familyId })).toMatchObject({
      storageLocation: 'grass-old.png',
    });

    const saved = await saveGenerated(request({
      name: 'grass',
      tile_width: 32,
      tile_height: 32,
      image_data: `data:image/png;base64,${png.toString('base64')}`,
      category: 'vegetation',
      label: 'grass',
      generationMode: 'texture',
      role: 'family',
      sourceFamilyIds: [],
      model: 'gemini',
      prompt: 'structured prompt',
      regenerateTilesetId: familyId.toHexString(),
    }), params());
    expect(saved.status).toBe(200);
    expect((await saved.json()).id).toBe(familyId.toHexString());

    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    expect(project?.tilesets).toEqual([
      familyId.toHexString(),
      otherFamilyId.toHexString(),
      transitionId.toHexString(),
    ]);
    expect(await db.collection('tilesets').findOne({ _id: transitionId })).toMatchObject({
      storageLocation: 'transition-old.png',
      generation_metadata: { status: 'stale' },
    });
    expect(await db.collection('tilesets').findOne({ _id: otherFamilyId })).toMatchObject({
      generation_metadata: { status: 'stale' },
    });
    expect(await db.collection('tilesets').findOne({ _id: familyId })).toMatchObject({
      generation_metadata: { status: 'fresh' },
    });
  });

  it('keeps imported and legacy generated tilesets out of automatic lineage', async () => {
    await db.collection('tilesets').insertMany([
      { _id: new ObjectId(), projectId, name: 'imported' },
      {
        _id: new ObjectId(),
        projectId,
        name: 'legacy',
        generation_metadata: {
          generated: true,
          style: 'fantasy',
          prompt: 'old',
          generated_at: new Date(),
        },
      },
    ]);
    expect((await generate(request({
      stage: 'family',
      category: 'ground',
      label: 'dirt',
    }), params())).status).toBe(409);
  });

  it('uses the project default model and a non-persistent per-request override', async () => {
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { generationModel: 'gemini' } },
    );

    expect((await generate(request({
      stage: 'base',
      category: 'vegetation',
      label: 'grass',
      generationMode: 'texture',
    }), params())).status).toBe(200);
    expect(mockedGetGenerationClient).toHaveBeenCalledWith('gemini');

    mockedGetGenerationClient.mockClear();
    mockedGetGenerationClient.mockReturnValue({
      model: 'gpt',
      isAvailable: () => true,
      generate: generateImage,
    });
    expect((await generate(request({
      stage: 'base',
      category: 'vegetation',
      label: 'meadow',
      generationMode: 'texture',
      model: 'gpt',
    }), params())).status).toBe(200);
    expect(mockedGetGenerationClient).toHaveBeenCalledWith('gpt');
    expect(await db.collection('projects').findOne({ _id: new ObjectId(projectId) })).toMatchObject({
      generationModel: 'gemini',
    });
  });

  it.each([
    ['not_supported', 409],
    ['misconfigured', 409],
    ['quota', 409],
    ['rate_limit', 429],
    ['upstream', 502],
  ] as const)('maps %s to %i without a usable preview', async (reason, status) => {
    generateImage.mockRejectedValueOnce(new GenerationUnavailableError(
      'gpt',
      reason,
      `${reason} failure`,
    ));
    mockedGetGenerationClient.mockReturnValue({
      model: 'gpt',
      isAvailable: () => true,
      generate: generateImage,
    });

    const response = await generate(request({
      stage: 'base',
      category: 'vegetation',
      label: 'grass',
      generationMode: 'texture',
      model: 'gpt',
    }), params());

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({
      code: 'model_unavailable',
      reason,
    });
    expect(uploadTilesetImage).not.toHaveBeenCalled();
  });

  it('refuses an unavailable selected model before calling generate', async () => {
    mockedGetGenerationClient.mockReturnValue({
      model: 'claude',
      isAvailable: () => false,
      generate: generateImage,
    });

    const response = await generate(request({
      stage: 'base',
      category: 'vegetation',
      label: 'grass',
      generationMode: 'texture',
      model: 'claude',
    }), params());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ reason: 'not_supported' });
    expect(generateImage).not.toHaveBeenCalled();
  });
});
