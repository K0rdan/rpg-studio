import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { getTilesetStorage } from '@/lib/storage';
import { requireProjectAccess } from '@/lib/apiAuth';
import { assetImageUrl } from '@/lib/assetImageUrl';
import { normalizeAssetFolderPath } from '@/lib/assetFolders';
import {
  isAssetName,
  isGenerationDescription,
  isGenerationModelId,
  isProjectStyleSpec,
  isTileFamilyCategory,
  type GenerationRole,
  type TilingMode,
} from '@packages/types';
import {
  findTransitionForPair,
  generatedTilesetId,
  listAcceptedFamilies,
  listGeneratedTilesets,
  sortPairFamilyIds,
} from '@/lib/generation/familyLookup';
import { resolveGenerationMode } from '@/lib/generation/category-config';
import { markDependentsStale } from '@/lib/generation/lineage';
import {
  postProcessGeneratedImage,
  resolveRequestedTilingMode,
} from '@/lib/generation/postProcessor';

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];
}

/**
 * POST /api/projects/[projectId]/tilesets/save-generated
 *
 * Persist a reviewed, post-processed generated tileset.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();
    const { userId } = access;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ message: 'Invalid generated tileset payload' }, { status: 400 });
    }

    const request = body as Record<string, unknown>;
    const imageData = request.image_data;
    const prompt = request.prompt;
    const model = request.model;
    const role = request.role as GenerationRole | undefined;
    const hasFolderPath = Object.prototype.hasOwnProperty.call(request, 'folderPath');
    const folderPath = normalizeAssetFolderPath(request.folderPath);
    const regenerateTilesetId = typeof request.regenerateTilesetId === 'string'
      && request.regenerateTilesetId
      ? request.regenerateTilesetId
      : null;
    const subjectDescription = typeof request.subjectDescription === 'string'
      ? request.subjectDescription.trim()
      : request.subjectDescription;
    const styleSpec = access.project.styleSpec;

    if (!isProjectStyleSpec(styleSpec)) {
      return NextResponse.json(
        { message: 'Save a valid project style before accepting generated tiles' },
        { status: 400 },
      );
    }
    if (
      (role !== 'family' && role !== 'transition')
      || !isGenerationModelId(model)
      || typeof prompt !== 'string'
      || !prompt.trim()
      || request.tile_width !== styleSpec.tileSize
      || request.tile_height !== styleSpec.tileSize
      || typeof imageData !== 'string'
      || !imageData.startsWith('data:image/png;base64,')
    ) {
      return NextResponse.json(
        { message: 'Invalid generated tileset acceptance payload' },
        { status: 400 },
      );
    }
    if (folderPath === null) {
      return NextResponse.json({ message: 'Invalid asset folder path' }, { status: 400 });
    }

    const families = await listAcceptedFamilies(db, projectId);
    const generated = await listGeneratedTilesets(db, projectId);
    const category = request.category;
    let sourceFamilyIds = readStringArray(request.sourceFamilyIds);
    let pairFamilyIds: [string, string] | null = null;
    const name = typeof request.name === 'string' && request.name.trim()
      ? request.name.trim()
      : '';
    if (!isAssetName(name)) {
      return NextResponse.json({ message: 'Asset name must contain 1–64 characters' }, { status: 400 });
    }

    if (role === 'family') {
      if (!isTileFamilyCategory(category) || !isGenerationDescription(subjectDescription)) {
        return NextResponse.json(
          { message: 'A family requires a category and a texture or object description' },
          { status: 400 },
        );
      }
      const remainingFamilies = regenerateTilesetId
        ? families.filter((family) => generatedTilesetId(family) !== regenerateTilesetId)
        : families;
      if (!regenerateTilesetId && remainingFamilies.length === 0 && sourceFamilyIds.length !== 0) {
        return NextResponse.json(
          { message: 'A first family cannot record source families' },
          { status: 400 },
        );
      }
      if (!regenerateTilesetId && remainingFamilies.length > 0 && sourceFamilyIds.length === 0) {
        return NextResponse.json(
          { message: 'Later families must record at least one visual reference' },
          { status: 400 },
        );
      }
    } else {
      const requestedPair = readStringArray(request.pairFamilyIds);
      if (requestedPair.length !== 2 || requestedPair[0] === requestedPair[1]) {
        return NextResponse.json(
          { message: 'A transition requires two distinct family ids' },
          { status: 400 },
        );
      }
      pairFamilyIds = sortPairFamilyIds(requestedPair[0], requestedPair[1]);
      sourceFamilyIds = pairFamilyIds;
      const pairFamilies = pairFamilyIds
        .map((id) => families.find((family) => generatedTilesetId(family) === id))
        .filter(Boolean);
      if (pairFamilies.length !== 2) {
        return NextResponse.json(
          { message: 'Both transition families must already be accepted' },
          { status: 409 },
        );
      }
      const existingPair = findTransitionForPair(generated, pairFamilyIds[0], pairFamilyIds[1]);
      if (existingPair && generatedTilesetId(existingPair) !== regenerateTilesetId) {
        return NextResponse.json(
          { message: 'A transition for this family pair already exists' },
          { status: 409 },
        );
      }
    }

    const resolvedMode = resolveGenerationMode({
      stage: role === 'transition' ? 'transition' : (
        sourceFamilyIds.length === 0 ? 'base' : 'family'
      ),
      category,
      requested: request.generationMode,
    });
    if (!resolvedMode.ok) {
      return NextResponse.json({ message: resolvedMode.message }, { status: 400 });
    }

    const base64Data = imageData.slice('data:image/png;base64,'.length);
    const imageBuffer = Buffer.from(base64Data, 'base64');
    let processedImage: Buffer;
    let processedMode = resolvedMode.mode;
    let tilingMode: TilingMode = 'individual';
    let selfTilingScore: number | undefined;
    try {
      const processed = await postProcessGeneratedImage(
        new Uint8Array(imageBuffer),
        styleSpec.tileSize,
        resolvedMode.mode,
      );
      processedImage = Buffer.from(processed.bytes);
      processedMode = processed.generationMode;
      selfTilingScore = processed.selfTilingScore;
      const resolvedTiling = resolveRequestedTilingMode(request.tilingMode, processed.tilingMode);
      if (!resolvedTiling.ok) {
        return NextResponse.json({ message: resolvedTiling.message }, { status: 400 });
      }
      tilingMode = resolvedTiling.mode;
    } catch {
      return NextResponse.json({ message: 'Invalid generated PNG image' }, { status: 400 });
    }

    const storage = getTilesetStorage();
    const now = new Date();
    const generation_metadata = {
      generated: true as const,
      prompt: prompt.trim(),
      generated_at: now,
      model,
      role,
      ...(isTileFamilyCategory(category) ? { category } : {}),
      ...(isGenerationDescription(subjectDescription) ? { generationDescription: subjectDescription } : {}),
      status: 'fresh' as const,
      sourceFamilyIds,
      ...(pairFamilyIds ? { pairFamilyIds } : {}),
      generationMode: processedMode,
      tilingMode,
      ...(selfTilingScore === undefined ? {} : { selfTilingScore }),
    };

    if (regenerateTilesetId) {
      if (!ObjectId.isValid(regenerateTilesetId)) {
        return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
      }
      const existing = await db.collection('tilesets').findOne({
        _id: new ObjectId(regenerateTilesetId),
        projectId,
      });
      if (!existing) {
        return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
      }

      const storageLocation = await storage.uploadTilesetImage({
        userId,
        projectId,
        tilesetId: regenerateTilesetId,
        mimeType: 'image/png',
        data: processedImage,
      });
      await db.collection('tilesets').updateOne(
        { _id: new ObjectId(regenerateTilesetId), projectId },
        {
          $set: {
            name,
            ...(hasFolderPath ? { folderPath } : {}),
            tile_width: styleSpec.tileSize,
            tile_height: styleSpec.tileSize,
            storageLocation: storageLocation.storageKey,
            generation_metadata,
            updatedAt: now,
          },
        },
      );
      await markDependentsStale(db, projectId, regenerateTilesetId);

      const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
      const tilesetIds = Array.isArray(project?.tilesets) ? project.tilesets : [];
      if (!tilesetIds.includes(regenerateTilesetId)) {
        return NextResponse.json({
          message: 'Regenerated tileset is missing from the project list',
        }, { status: 409 });
      }

      return NextResponse.json({
        id: regenerateTilesetId,
        name,
        ...(hasFolderPath ? { folderPath } : {}),
        image_source: assetImageUrl(projectId, 'tileset', regenerateTilesetId),
        tile_width: styleSpec.tileSize,
        tile_height: styleSpec.tileSize,
        projectId,
        generation_metadata,
        createdAt: existing.createdAt,
        updatedAt: now,
      }, { status: 200 });
    }

    const tilesetId = new ObjectId();
    const storageLocation = await storage.uploadTilesetImage({
      userId,
      projectId,
      tilesetId: tilesetId.toHexString(),
      mimeType: 'image/png',
      data: processedImage,
    });
    const tilesetDoc = {
      _id: tilesetId,
      projectId,
      name,
      ...(folderPath ? { folderPath } : {}),
      tile_width: styleSpec.tileSize,
      tile_height: styleSpec.tileSize,
      storageLocation: storageLocation.storageKey,
      generation_metadata,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection('tilesets').insertOne(tilesetDoc);
    await db.collection<{ tilesets: string[] }>('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $push: { tilesets: tilesetId.toHexString() } },
    );

    return NextResponse.json({
      id: tilesetId.toHexString(),
      name,
      ...(folderPath ? { folderPath } : {}),
      image_source: assetImageUrl(projectId, 'tileset', tilesetId.toHexString()),
      tile_width: styleSpec.tileSize,
      tile_height: styleSpec.tileSize,
      projectId,
      generation_metadata,
      createdAt: now,
      updatedAt: now,
    }, { status: 201 });
  } catch (error) {
    console.error('Error saving generated tileset:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
