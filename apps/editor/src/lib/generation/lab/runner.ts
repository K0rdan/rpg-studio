import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type {
  GenerationModelId,
  GenerationReferenceImage,
  ProjectStyleSpec,
  RawGenerationResult,
} from '@packages/types';

import type { GenerationClient } from '../generationErrors';
import {
  measureAgainstReference,
  measureTile,
  type ReferenceMetrics,
  type TileMetrics,
} from '../metrics';
import { resolveOutputContract } from '../outputContract';
import { postProcessGeneratedImage } from '../postProcessor';
import {
  buildBasePrompt,
  buildFamilyPrompt,
} from '../promptBuilder';
import { prepareReferenceImages } from '../referencePrep';
import type {
  GenerationVariant,
  LabCase,
  LabReference,
  PostVariant,
} from './definitions';

export interface LabPostResult {
  postVariantId: string;
  file: string;
  tiledFile: string;
  metrics: TileMetrics;
  /** Against the first original (unprepared) reference, when the case has one. */
  vsReference?: ReferenceMetrics;
  selfTilingScore?: number;
  reviewPassed: boolean;
}

export interface LabRawResult {
  caseId: string;
  generationVariantId: string;
  /** 0 is reserved for an image that was not produced by this run (dump replay). */
  repeat: number;
  rawFile?: string;
  promptFile?: string;
  inputFile?: string;
  rawMetrics?: TileMetrics;
  rawVsReference?: ReferenceMetrics;
  posts: LabPostResult[];
  durationMs?: number;
  error?: string;
}

export interface LabManifest {
  runId: string;
  createdAt: string;
  model: GenerationModelId;
  imageModel?: unknown;
  repeats: number;
  cases: Array<{ id: string; label: string; subjectDescription: string; references: string[] }>;
  generationVariants: GenerationVariant[];
  postVariants: PostVariant[];
}

export interface LabResults {
  manifest: LabManifest;
  raws: LabRawResult[];
}

export interface LabRunOptions {
  runId: string;
  outputDir: string;
  fixturesDir: string;
  cases: LabCase[];
  generationVariants: GenerationVariant[];
  postVariants: PostVariant[];
  repeats: number;
  concurrency?: number;
  model?: GenerationModelId;
  /** Required unless every raw image comes from `existingRaws`. */
  client?: GenerationClient;
  /** Images that already exist (a debug dump's own raw) to reprocess for free. */
  existingRaws?: Array<{ caseId: string; label: string; bytes: Uint8Array }>;
  log?: (message: string) => void;
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function rawExtension(mimeType: RawGenerationResult['mimeType']): string {
  return mimeType === 'image/jpeg' ? 'jpg' : 'png';
}

async function loadReference(
  reference: LabReference,
  fixturesDir: string,
): Promise<GenerationReferenceImage> {
  const bytes = reference.bytes
    ?? (reference.file
      ? new Uint8Array(await readFile(path.join(fixturesDir, reference.file)))
      : null);
  if (!bytes) {
    throw new Error(`Reference ${reference.id} has neither a file nor bytes`);
  }
  return { tilesetId: reference.id, mimeType: 'image/png', bytes };
}

async function tiledPreview(tile: Buffer, size: number): Promise<Buffer> {
  const repeats = 3;
  return sharp({
    create: {
      width: size * repeats,
      height: size * repeats,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite(Array.from({ length: repeats * repeats }, (_, index) => ({
      input: tile,
      left: (index % repeats) * size,
      top: Math.floor(index / repeats) * size,
    })))
    .png()
    .toBuffer();
}

/** Turns one raw image into a tile with every post variant, and measures each. */
export async function processRaw(input: {
  rawBytes: Uint8Array;
  style: ProjectStyleSpec;
  postVariants: PostVariant[];
  originalReferences: GenerationReferenceImage[];
  outputDir: string;
  relativeDir: string;
}): Promise<{
  rawMetrics: TileMetrics;
  rawVsReference?: ReferenceMetrics;
  posts: LabPostResult[];
}> {
  const contract = resolveOutputContract({
    stage: 'base',
    generationMode: 'texture',
    tileSize: input.style.tileSize,
  });
  const firstReference = input.originalReferences[0]?.bytes;
  const rawMetrics = await measureTile(input.rawBytes);
  const rawVsReference = firstReference
    ? await measureAgainstReference(input.rawBytes, firstReference)
    : undefined;

  const posts: LabPostResult[] = [];
  for (const variant of input.postVariants) {
    const processed = await postProcessGeneratedImage(
      input.rawBytes,
      input.style.tileSize,
      contract,
      variant.options,
    );
    const tile = Buffer.from(processed.bytes);
    const file = path.join(input.relativeDir, `post-${safeId(variant.id)}.png`);
    const tiledFile = path.join(input.relativeDir, `post-${safeId(variant.id)}.tiled.png`);
    await writeFile(path.join(input.outputDir, file), tile);
    await writeFile(
      path.join(input.outputDir, tiledFile),
      await tiledPreview(tile, contract.width),
    );
    posts.push({
      postVariantId: variant.id,
      file,
      tiledFile,
      metrics: await measureTile(tile),
      vsReference: firstReference
        ? await measureAgainstReference(tile, firstReference)
        : undefined,
      selfTilingScore: processed.selfTilingScore,
      reviewPassed: processed.reviewPassed,
    });
  }
  return { rawMetrics, rawVsReference, posts };
}

async function runModelCell(
  options: LabRunOptions,
  labCase: LabCase,
  variant: GenerationVariant,
  repeat: number,
  references: GenerationReferenceImage[],
): Promise<LabRawResult> {
  const relativeDir = path.join('cells', safeId(labCase.id), safeId(variant.id), `r${repeat}`);
  const result: LabRawResult = {
    caseId: labCase.id,
    generationVariantId: variant.id,
    repeat,
    posts: [],
  };
  try {
    await mkdir(path.join(options.outputDir, relativeDir), { recursive: true });
    const prepared = await prepareReferenceImages(references, variant.reference);
    const builder = prepared.length > 0 ? buildFamilyPrompt : buildBasePrompt;
    const built = builder({
      style: labCase.style,
      subjectDescription: labCase.subjectDescription,
      generationMode: labCase.generationMode,
      options: variant.prompt,
      referenceMaterials: labCase.references.map((reference) => reference.description),
    });

    const client = options.client;
    if (!client) {
      throw new Error('A generation client is required to call the model');
    }
    const startedAt = performance.now();
    const raw = await client.generate({
      model: client.model,
      prompt: built.prompt,
      referenceImages: prepared,
      tileSize: labCase.style.tileSize,
    });
    result.durationMs = Math.round(performance.now() - startedAt);

    const rawFile = path.join(relativeDir, `raw.${rawExtension(raw.mimeType)}`);
    const promptFile = path.join(relativeDir, 'prompt.txt');
    const inputFile = path.join(relativeDir, 'input.json');
    await writeFile(path.join(options.outputDir, rawFile), raw.bytes);
    await writeFile(
      path.join(options.outputDir, promptFile),
      built.sections.map((section) => `## ${section.title}\n\n${section.text}`).join('\n\n'),
      'utf8',
    );
    await writeFile(
      path.join(options.outputDir, inputFile),
      JSON.stringify({
        case: {
          id: labCase.id,
          category: labCase.category,
          subjectDescription: labCase.subjectDescription,
          generationMode: labCase.generationMode,
          style: labCase.style,
          references: labCase.references.map((reference) => ({
            id: reference.id,
            description: reference.description,
            file: reference.file,
          })),
        },
        generationVariant: variant,
        sentReferenceCount: prepared.length,
        providerConfig: client.describeConfig?.() ?? {},
        prompt: built.prompt,
        promptSections: built.sections,
        repeat,
      }, null, 2),
      'utf8',
    );

    result.rawFile = rawFile;
    result.promptFile = promptFile;
    result.inputFile = inputFile;
    Object.assign(result, await processRaw({
      rawBytes: raw.bytes,
      style: labCase.style,
      postVariants: options.postVariants,
      originalReferences: references,
      outputDir: options.outputDir,
      relativeDir,
    }));
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  return result;
}

async function runPool<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

export function applicableVariants(
  labCase: LabCase,
  variants: GenerationVariant[],
): GenerationVariant[] {
  return labCase.references.length > 0
    ? variants
    : variants.filter((variant) => !variant.needsReference);
}

export async function runLab(options: LabRunOptions): Promise<LabResults> {
  const log = options.log ?? (() => undefined);
  await mkdir(options.outputDir, { recursive: true });

  const referencesByCase = new Map<string, GenerationReferenceImage[]>();
  for (const labCase of options.cases) {
    const loaded = await Promise.all(
      labCase.references.map((reference) => loadReference(reference, options.fixturesDir)),
    );
    referencesByCase.set(labCase.id, loaded);
    await mkdir(path.join(options.outputDir, 'references', safeId(labCase.id)), { recursive: true });
    await Promise.all(loaded.map((image, index) => writeFile(
      path.join(options.outputDir, 'references', safeId(labCase.id), `ref-${index}.png`),
      image.bytes,
    )));
  }

  const tasks: Array<() => Promise<LabRawResult>> = [];
  for (const labCase of options.cases) {
    for (const variant of applicableVariants(labCase, options.generationVariants)) {
      for (let repeat = 1; repeat <= options.repeats; repeat += 1) {
        tasks.push(async () => {
          const result = await runModelCell(
            options,
            labCase,
            variant,
            repeat,
            referencesByCase.get(labCase.id) ?? [],
          );
          log(`${result.error ? 'FAIL' : 'ok  '} ${labCase.id} / ${variant.id} / r${repeat}${result.error ? ` — ${result.error}` : ` (${result.durationMs} ms)`}`);
          return result;
        });
      }
    }
  }
  const modelResults = await runPool(tasks, options.concurrency ?? 2);

  const replayResults: LabRawResult[] = [];
  for (const existing of options.existingRaws ?? []) {
    const labCase = options.cases.find((candidate) => candidate.id === existing.caseId);
    if (!labCase) {
      continue;
    }
    const relativeDir = path.join('cells', safeId(labCase.id), 'dump-original', 'r0');
    await mkdir(path.join(options.outputDir, relativeDir), { recursive: true });
    const rawFile = path.join(relativeDir, 'raw.png');
    await writeFile(path.join(options.outputDir, rawFile), existing.bytes);
    replayResults.push({
      caseId: labCase.id,
      generationVariantId: 'dump-original',
      repeat: 0,
      rawFile,
      ...(await processRaw({
        rawBytes: existing.bytes,
        style: labCase.style,
        postVariants: options.postVariants,
        originalReferences: referencesByCase.get(labCase.id) ?? [],
        outputDir: options.outputDir,
        relativeDir,
      })),
    });
    log(`ok   ${labCase.id} / dump-original (replayed)`);
  }

  const manifest: LabManifest = {
    runId: options.runId,
    createdAt: new Date().toISOString(),
    model: options.model ?? options.client?.model ?? 'gemini',
    imageModel: options.client?.describeConfig?.().imageModel,
    repeats: options.repeats,
    cases: options.cases.map((labCase) => ({
      id: labCase.id,
      label: labCase.label,
      subjectDescription: labCase.subjectDescription,
      references: labCase.references.map((reference) => reference.id),
    })),
    generationVariants: options.generationVariants,
    postVariants: options.postVariants,
  };
  const results: LabResults = { manifest, raws: [...replayResults, ...modelResults] };
  await writeFile(
    path.join(options.outputDir, 'results.json'),
    JSON.stringify(results, null, 2),
    'utf8',
  );
  return results;
}
