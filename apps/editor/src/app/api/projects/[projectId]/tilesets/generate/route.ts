import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  isAssetName,
  isGenerationDescription,
  isGenerationModelId,
  isProjectStyleSpec,
  isTileFamilyCategory,
  isTilingMode,
  type GenerationMode,
  type GenerationModelId,
  type GenerationPromptSection,
  type GenerationReferenceImage,
  type ProcessedGenerationResult,
} from '@packages/types';
import { requireProjectAccess } from '@/lib/apiAuth';
import {
  GenerationUnavailableError,
  getGenerationClient,
} from '@/lib/generation/generationClient';
import {
  generatedTilesetId,
  listAcceptedFamilies,
  loadReferenceImages,
  sortPairFamilyIds,
  type GeneratedTilesetDocument,
} from '@/lib/generation/familyLookup';
import { resolveGenerationMode } from '@/lib/generation/category-config';
import { dumpGenerationPreview } from '@/lib/generation/debugDump';
import { resolveOutputContract } from '@/lib/generation/outputContract';
import {
  BASELINE_POST_PROCESS,
  postProcessGeneratedImage,
} from '@/lib/generation/postProcessor';
import {
  buildBasePrompt,
  buildFamilyPrompt,
  buildPathAutotilePrompt,
  buildTransitionPrompt,
  type PromptOptions,
} from '@/lib/generation/promptBuilder';
import { connectToDatabase } from '@/lib/mongodb';
import { getTilesetStorage } from '@/lib/storage';

export const runtime = 'nodejs';

/** Production prompt: every experiment flag stays off until the lab promotes one. */
const PRODUCTION_PROMPT_OPTIONS: PromptOptions = {};

function qualificationSummary(processed: ProcessedGenerationResult): string {
  if (processed.generationMode === 'path-autotile') {
    const slots = processed.passedSlotIds?.join(', ') || 'none';
    const layout = processed.pathAutotileLayoutId ?? 'layout';
    return processed.reviewPassed
      ? `path-autotile ${layout} passed slots: ${slots}`
      : `path-autotile ${layout} failed; passed slots: ${slots}`;
  }
  if (processed.generationMode === 'prop') {
    return 'prop background removed';
  }
  if (processed.selfTilingScore === undefined) {
    return 'transition atlas fitted';
  }
  const score = ` (score ${processed.selfTilingScore.toFixed(3)})`;
  return processed.reviewPassed
    ? `surface self-tiling passed${score}`
    : `surface self-tiling failed${score}`;
}

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
    if (request.tilingMode !== undefined && !isTilingMode(request.tilingMode)) {
      return NextResponse.json({ message: 'Invalid tiling mode' }, { status: 400 });
    }

    const regenerateTilesetId = typeof request.regenerateTilesetId === 'string'
      && request.regenerateTilesetId
      ? request.regenerateTilesetId
      : null;
    const { db } = await connectToDatabase();
    const families = await listAcceptedFamilies(db, projectId);

    let stage = request.stage;
    let category = request.category;
    let assetName = typeof request.name === 'string' ? request.name.trim() : request.name;
    let subjectDescription = typeof request.subjectDescription === 'string'
      ? request.subjectDescription.trim()
      : request.subjectDescription;
    let sourceFamilies: GeneratedTilesetDocument[] = [];
    let pairFamilyIds: [string, string] | null = null;
    let role: 'family' | 'transition' = 'family';
    let prompt = '';
    let promptSections: GenerationPromptSection[] = [];
    let name = '';
    let generationMode: GenerationMode = 'texture';
    let parentMaterialId = typeof request.parentMaterialId === 'string'
      ? request.parentMaterialId
      : undefined;
    let parentMaterialDescription = '';

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
      assetName = typeof request.name === 'string' ? request.name.trim() : existing.name;
      subjectDescription = typeof request.subjectDescription === 'string'
        ? request.subjectDescription.trim()
        : existing.generation_metadata.generationDescription ?? existing.generation_metadata.label;
      if (request.generationMode === undefined) {
        request.generationMode = existing.generation_metadata.generationMode;
      }
      if (request.parentMaterialId === undefined) {
        request.parentMaterialId = existing.generation_metadata.parentMaterialId;
      }
      if (typeof request.parentMaterialId === 'string') {
        parentMaterialId = request.parentMaterialId;
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
      if (!isTileFamilyCategory(category)
        || !isAssetName(assetName)
        || !isGenerationDescription(subjectDescription)) {
        return NextResponse.json(
          { message: 'Enter an asset name and a texture or object description (1–200 characters)' },
          { status: 400 },
        );
      }
      const resolvedMode = resolveGenerationMode({
        stage: 'base',
        category,
        requested: request.generationMode,
        parentMaterialId,
      });
      if (!resolvedMode.ok) {
        return NextResponse.json({ message: resolvedMode.message }, { status: 400 });
      }
      if (resolvedMode.mode === 'path-autotile') {
        return NextResponse.json(
          { message: 'Accept a surface material before generating a path autotile' },
          { status: 400 },
        );
      }
      const builtPrompt = buildBasePrompt({
        style,
        subjectDescription,
        generationMode: resolvedMode.mode,
        options: PRODUCTION_PROMPT_OPTIONS,
      });
      prompt = builtPrompt.prompt;
      promptSections = builtPrompt.sections;
      name = assetName;
      generationMode = resolvedMode.mode;
    } else if (stage === 'family') {
      if (families.length === 0) {
        return NextResponse.json(
          { message: 'Accept a first family before generating another family' },
          { status: 409 },
        );
      }
      if (!isTileFamilyCategory(category)
        || !isAssetName(assetName)
        || !isGenerationDescription(subjectDescription)) {
        return NextResponse.json(
          { message: 'Enter an asset name and a texture or object description (1–200 characters)' },
          { status: 400 },
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
        parentMaterialId,
      });
      if (!resolvedMode.ok) {
        return NextResponse.json({ message: resolvedMode.message }, { status: 400 });
      }
      if (resolvedMode.mode === 'path-autotile') {
        const parent = families.find((family) => (
          generatedTilesetId(family) === parentMaterialId
          && family.generation_metadata?.generationMode !== 'prop'
          && family.generation_metadata?.generationMode !== 'path-autotile'
        ));
        if (!parent || !parentMaterialId) {
          return NextResponse.json(
            { message: 'Parent surface material was not found' },
            { status: 400 },
          );
        }
        parentMaterialDescription = parent.generation_metadata?.generationDescription
          || parent.generation_metadata?.label
          || parent.name
          || 'parent surface';
        sourceFamilies = [parent];
      }
      const builtPrompt = resolvedMode.mode === 'path-autotile'
        ? buildPathAutotilePrompt({
          style,
          subjectDescription,
          parentMaterialDescription,
          hasReferences: true,
        })
        : buildFamilyPrompt({
          style,
          subjectDescription,
          generationMode: resolvedMode.mode,
          options: PRODUCTION_PROMPT_OPTIONS,
          referenceMaterials: sourceFamilies
            .map((family) => family.generation_metadata?.generationDescription ?? family.name)
            .filter((value): value is string => typeof value === 'string'),
        });
      prompt = builtPrompt.prompt;
      promptSections = builtPrompt.sections;
      name = assetName;
      generationMode = resolvedMode.mode;
    } else if (stage === 'transition') {
      if (!isAssetName(assetName)) {
        return NextResponse.json({ message: 'Asset name must contain 1–64 characters' }, { status: 400 });
      }
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
      generationMode = 'texture';
      const builtPrompt = buildTransitionPrompt({ style });
      prompt = builtPrompt.prompt;
      promptSections = builtPrompt.sections;
      name = assetName;
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

    const outputContract = resolveOutputContract({
      stage: stage === 'transition' ? 'transition' : stage === 'family' ? 'family' : 'base',
      generationMode,
      tileSize: style.tileSize,
      parentMaterialId,
    });
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
    const generateStartedAt = performance.now();
    const rawResult = await client.generate({
      model,
      prompt,
      referenceImages,
      tileSize: style.tileSize,
    });
    const postProcessStartedAt = performance.now();
    const processed = await postProcessGeneratedImage(
      rawResult,
      style.tileSize,
      outputContract,
      BASELINE_POST_PROCESS,
    );
    const finishedAt = performance.now();
    const outputBuffer = Buffer.from(processed.bytes);
    const qualificationNote = qualificationSummary(processed);
    await dumpGenerationPreview({
      rawBytes: rawResult.bytes,
      processed: outputBuffer,
      model,
      stage,
      assetName,
      prompt,
      promptSections,
      qualificationNote,
      referenceImages: referenceImages.map((image) => {
        const family = sourceFamilies.find((candidate) => (
          generatedTilesetId(candidate) === image.tilesetId
        ));
        return {
          tilesetId: image.tilesetId,
          name: family?.name,
          description: family?.generation_metadata?.generationDescription
            ?? family?.generation_metadata?.label,
          bytes: image.bytes,
        };
      }),
      input: {
        request,
        resolved: {
          stage,
          category,
          assetName,
          subjectDescription,
          generationMode,
          role,
          model,
          parentMaterialId,
          regenerateTilesetId,
          pairFamilyIds,
        },
        style,
        outputContract: {
          kind: outputContract.kind,
          width: outputContract.width,
          height: outputContract.height,
          columns: outputContract.columns,
          rows: outputContract.rows,
        },
        providerConfig: client.describeConfig?.() ?? {},
        promptOptions: PRODUCTION_PROMPT_OPTIONS,
        referenceMode: 'full',
        postProcess: BASELINE_POST_PROCESS,
        timingsMs: {
          generate: Math.round(postProcessStartedAt - generateStartedAt),
          postProcess: Math.round(finishedAt - postProcessStartedAt),
        },
      },
    });

    return NextResponse.json({
      preview_data: `data:image/png;base64,${outputBuffer.toString('base64')}`,
      generation_params: {
        stage,
        name,
        subjectDescription: isGenerationDescription(subjectDescription)
          ? subjectDescription
          : undefined,
        category: isTileFamilyCategory(category) ? category : undefined,
        role,
        generationMode: processed.generationMode,
        tilingMode: processed.tilingMode,
        selfTilingScore: processed.selfTilingScore,
        reviewPassed: processed.reviewPassed,
        pathAutotileLayoutId: processed.pathAutotileLayoutId,
        parentMaterialId: processed.parentMaterialId ?? parentMaterialId,
        passedSlotIds: processed.passedSlotIds,
        tile_width: style.tileSize,
        tile_height: style.tileSize,
        model,
        sourceFamilyIds: sourceFamilies.map(generatedTilesetId),
        pairFamilyIds,
        regenerateTilesetId,
        prompt,
        promptSections,
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
