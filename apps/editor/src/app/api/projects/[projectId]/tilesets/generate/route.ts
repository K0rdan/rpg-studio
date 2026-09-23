import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  isGenerationLabel,
  isGenerationModelId,
  isProjectStyleSpec,
  isTileFamilyCategory,
  type GenerationMode,
  type GenerationModelId,
  type GenerationReferenceImage,
} from '@packages/types';
import { requireProjectAccess } from '@/lib/apiAuth';
import {
  GenerationUnavailableError,
  getGenerationClient,
} from '@/lib/generation/generationClient';
import {
  findDuplicateFamily,
  generatedTilesetId,
  listAcceptedFamilies,
  loadReferenceImages,
  sortPairFamilyIds,
  type GeneratedTilesetDocument,
} from '@/lib/generation/familyLookup';
import { resolveGenerationMode } from '@/lib/generation/category-config';
import { dumpGenerationPreview } from '@/lib/generation/debugDump';
import { postProcessGeneratedImage } from '@/lib/generation/postProcessor';
import {
  buildBasePrompt,
  buildFamilyPrompt,
  buildTransitionPrompt,
} from '@/lib/generation/promptBuilder';
import { connectToDatabase } from '@/lib/mongodb';
import { getTilesetStorage } from '@/lib/storage';

export const runtime = 'nodejs';

function unavailableResponse(error: GenerationUnavailableError) {
  const status = error.reason === 'rate_limit'
    ? 429
    : error.reason === 'upstream'
      ? 502
      : 409;
  return NextResponse.json({
    message: error.message,
    code: 'model_unavailable',
    reason: error.reason,
  }, { status });
}

function resolveRequestedModel(
  requested: unknown,
  projectDefault: unknown,
): GenerationModelId | NextResponse {
  if (requested !== undefined) {
    if (!isGenerationModelId(requested)) {
      return NextResponse.json({ message: 'Invalid generation model' }, { status: 400 });
    }
    return requested;
  }
  if (isGenerationModelId(projectDefault)) {
    return projectDefault;
  }
  for (const candidate of ['gemini', 'gpt', 'claude'] as const) {
    if (getGenerationClient(candidate).isAvailable()) {
      return candidate;
    }
  }
  return 'gemini';
}

/**
 * POST /api/projects/[projectId]/tilesets/generate
 *
 * Generate a non-persisted tileset preview for base, family, or transition stages.
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ message: 'Invalid generation parameters' }, { status: 400 });
    }
    const request = body as Record<string, unknown>;
    if (
      Object.prototype.hasOwnProperty.call(request, 'customPrompt')
      || Object.prototype.hasOwnProperty.call(request, 'custom_prompt')
    ) {
      return NextResponse.json(
        { message: 'Free-form custom prompts are not supported' },
        { status: 400 },
      );
    }

    const style = access.project.styleSpec;
    if (!isProjectStyleSpec(style)) {
      return NextResponse.json(
        { message: 'Save a valid project style before generating tiles' },
        { status: 400 },
      );
    }

    const model = resolveRequestedModel(request.model, access.project.generationModel);
    if (model instanceof NextResponse) {
      return model;
    }

    const regenerateTilesetId = typeof request.regenerateTilesetId === 'string'
      && request.regenerateTilesetId
      ? request.regenerateTilesetId
      : null;
    const { db } = await connectToDatabase();
    const families = await listAcceptedFamilies(db, projectId);

    let stage = request.stage;
    let category = request.category;
    let label = typeof request.label === 'string' ? request.label.trim() : request.label;
    let sourceFamilies: GeneratedTilesetDocument[] = [];
    let pairFamilyIds: [string, string] | null = null;
    let role: 'family' | 'transition' = 'family';
    let prompt = '';
    let name = '';
    let generationMode: GenerationMode = 'texture';

    if (regenerateTilesetId) {
      if (!ObjectId.isValid(regenerateTilesetId)) {
        return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
      }
      const existing = await db.collection('tilesets').findOne({
        _id: new ObjectId(regenerateTilesetId),
        projectId,
        'generation_metadata.generated': true,
      }) as GeneratedTilesetDocument | null;
      if (!existing?.generation_metadata) {
        return NextResponse.json({ message: 'Tileset not found' }, { status: 404 });
      }
      role = existing.generation_metadata.role === 'transition' ? 'transition' : 'family';
      stage = role === 'transition' ? 'transition' : (
        existing.generation_metadata.sourceFamilyIds?.length ? 'family' : 'base'
      );
      category = existing.generation_metadata.category;
      label = existing.generation_metadata.label;
      if (request.generationMode === undefined) {
        request.generationMode = existing.generation_metadata.generationMode;
      }
      if (role === 'transition' && existing.generation_metadata.pairFamilyIds) {
        pairFamilyIds = sortPairFamilyIds(...existing.generation_metadata.pairFamilyIds);
        sourceFamilies = pairFamilyIds
          .map((id) => families.find((family) => generatedTilesetId(family) === id))
          .filter((family): family is GeneratedTilesetDocument => Boolean(family));
      } else if (existing.generation_metadata.sourceFamilyIds?.length) {
        sourceFamilies = existing.generation_metadata.sourceFamilyIds
          .map((id) => families.find((family) => generatedTilesetId(family) === id))
          .filter((family): family is GeneratedTilesetDocument => Boolean(family));
      }
    }

    if (stage === 'base') {
      if (!regenerateTilesetId && families.length > 0) {
        return NextResponse.json(
          { message: 'A first family already exists for this project' },
          { status: 409 },
        );
      }
      if (!isTileFamilyCategory(category) || !isGenerationLabel(label)) {
        return NextResponse.json(
          { message: 'Invalid first-family generation parameters' },
          { status: 400 },
        );
      }
      if (!regenerateTilesetId && findDuplicateFamily(families, category, label)) {
        return NextResponse.json(
          { message: 'A generated family with this category and label already exists' },
          { status: 409 },
        );
      }
      const resolvedMode = resolveGenerationMode({
        stage: 'base',
        category,
        requested: request.generationMode,
      });
      if (!resolvedMode.ok) {
        return NextResponse.json({ message: resolvedMode.message }, { status: 400 });
      }
      prompt = buildBasePrompt({
        style,
        category,
        label,
        generationMode: resolvedMode.mode,
      }).prompt;
      name = label;
      generationMode = resolvedMode.mode;
    } else if (stage === 'family') {
      if (families.length === 0) {
        return NextResponse.json(
          { message: 'Accept a first family before generating another family' },
          { status: 409 },
        );
      }
      if (!isTileFamilyCategory(category) || !isGenerationLabel(label)) {
        return NextResponse.json(
          { message: 'Invalid family generation parameters' },
          { status: 400 },
        );
      }
      if (!regenerateTilesetId && findDuplicateFamily(families, category, label)) {
        return NextResponse.json(
          { message: 'A generated family with this category and label already exists' },
          { status: 409 },
        );
      }
      if (sourceFamilies.length === 0) {
        const requestedIds = Array.isArray(request.sourceFamilyIds)
          ? request.sourceFamilyIds.filter((value): value is string => typeof value === 'string')
          : [];
        sourceFamilies = requestedIds.length > 0
          ? requestedIds
            .map((id) => families.find((family) => generatedTilesetId(family) === id))
            .filter((family): family is GeneratedTilesetDocument => Boolean(family))
          : [families[0]];
      }
      if (sourceFamilies.length === 0) {
        return NextResponse.json(
          { message: 'At least one accepted family image is required as a visual reference' },
          { status: 409 },
        );
      }
      const resolvedMode = resolveGenerationMode({
        stage: 'family',
        category,
        requested: request.generationMode,
      });
      if (!resolvedMode.ok) {
        return NextResponse.json({ message: resolvedMode.message }, { status: 400 });
      }
      prompt = buildFamilyPrompt({
        style,
        category,
        label,
        generationMode: resolvedMode.mode,
        referenceLabels: sourceFamilies.map((family) => (
          family.generation_metadata?.label ?? family.name ?? generatedTilesetId(family)
        )),
      }).prompt;
      name = label;
      generationMode = resolvedMode.mode;
    } else if (stage === 'transition') {
      if (families.length < 2) {
        return NextResponse.json(
          { message: 'Accept two families before generating a transition' },
          { status: 409 },
        );
      }
      const requestedPair = Array.isArray(request.pairFamilyIds)
        ? request.pairFamilyIds.filter((value): value is string => typeof value === 'string')
        : pairFamilyIds;
      if (!requestedPair || requestedPair.length !== 2 || requestedPair[0] === requestedPair[1]) {
        return NextResponse.json(
          { message: 'Select two distinct accepted families for a transition' },
          { status: 400 },
        );
      }
      pairFamilyIds = sortPairFamilyIds(requestedPair[0], requestedPair[1]);
      sourceFamilies = pairFamilyIds
        .map((id) => families.find((family) => generatedTilesetId(family) === id))
        .filter((family): family is GeneratedTilesetDocument => Boolean(family));
      if (sourceFamilies.length !== 2) {
        return NextResponse.json(
          { message: 'Both transition families must be accepted generated families' },
          { status: 409 },
        );
      }
      role = 'transition';
      const familyA = {
        category: sourceFamilies[0].generation_metadata?.category ?? 'ground',
        label: sourceFamilies[0].generation_metadata?.label ?? sourceFamilies[0].name ?? 'A',
      };
      const familyB = {
        category: sourceFamilies[1].generation_metadata?.category ?? 'ground',
        label: sourceFamilies[1].generation_metadata?.label ?? sourceFamilies[1].name ?? 'B',
      };
      generationMode = 'texture';
      prompt = buildTransitionPrompt({ style, familyA, familyB }).prompt;
      name = `${familyA.label} ↔ ${familyB.label}`;
    } else {
      return NextResponse.json(
        { message: 'Invalid generation stage' },
        { status: 400 },
      );
    }

    const referenceImages: GenerationReferenceImage[] = sourceFamilies.length === 0
      ? []
      : await loadReferenceImages(getTilesetStorage(), sourceFamilies);
    if (stage !== 'base' && referenceImages.length === 0) {
      return NextResponse.json(
        { message: 'At least one accepted family image is required as a visual reference' },
        { status: 409 },
      );
    }

    const client = getGenerationClient(model);
    if (!client.isAvailable()) {
      return unavailableResponse(new GenerationUnavailableError(
        model,
        model === 'claude' ? 'not_supported' : 'misconfigured',
        model === 'claude'
          ? 'Claude cannot generate images'
          : `${model} image generation is not configured`,
      ));
    }
    const rawResult = await client.generate({
      model,
      prompt,
      referenceImages,
      tileSize: style.tileSize,
    });
    const processed = await postProcessGeneratedImage(
      rawResult,
      style.tileSize,
      generationMode,
    );
    const outputBuffer = Buffer.from(processed.bytes);
    await dumpGenerationPreview({
      rawBytes: rawResult.bytes,
      processed: outputBuffer,
      model,
      stage,
      label,
      prompt,
    });

    return NextResponse.json({
      preview_data: `data:image/png;base64,${outputBuffer.toString('base64')}`,
      generation_params: {
        stage,
        name,
        category: isTileFamilyCategory(category) ? category : undefined,
        label: isGenerationLabel(label) ? label : undefined,
        role,
        generationMode: processed.generationMode,
        tilingMode: processed.tilingMode,
        selfTilingScore: processed.selfTilingScore,
        tile_width: style.tileSize,
        tile_height: style.tileSize,
        model,
        sourceFamilyIds: sourceFamilies.map(generatedTilesetId),
        pairFamilyIds,
        regenerateTilesetId,
        prompt,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating tileset:', error);
    if (error instanceof GenerationUnavailableError) {
      return unavailableResponse(error);
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
