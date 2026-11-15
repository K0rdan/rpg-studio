import { createHash } from 'node:crypto';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type {
  GenerationMode,
  GenerationPromptSection,
  ProjectStyleSpec,
} from '@packages/types';

import { measureGeneration, type GenerationMetrics } from './metrics';
import type { PostProcessOptions } from './postProcessor';
import type { PromptOptions } from './promptBuilder';
import type { ReferenceMode } from './referencePrep';

const DEBUG_DIR_NAME = 'generation-debug';

export function shouldDumpGenerationPreview(
  nodeEnv = process.env.NODE_ENV,
): boolean {
  return nodeEnv === 'development';
}

export function generationDebugDir(cwd = process.cwd()): string {
  return path.join(cwd, 'public', DEBUG_DIR_NAME);
}

function slug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return normalized || 'preview';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatPromptSections(
  prompt: string,
  sections?: GenerationPromptSection[],
): string {
  if (!sections?.length) return prompt;
  return sections
    .map((section) => `## ${section.title}\n\n${section.text}`)
    .join('\n\n');
}

/** A reference image as it was sent to the model. */
export interface DebugReferenceImage {
  tilesetId: string;
  name?: string;
  /** What the reference shows, e.g. its generation description. */
  description?: string;
  bytes: Uint8Array;
}

/**
 * Everything needed to reproduce a generation: what the user asked for, what
 * the server resolved from it, and how each pipeline stage was configured.
 * The generation lab reads this file back (`from-dump`) to replay a UI run.
 */
export interface GenerationDebugInput {
  /** Request body received by the route (no secrets live in it). */
  request: Record<string, unknown>;
  resolved: {
    stage: unknown;
    category: unknown;
    assetName: unknown;
    subjectDescription: unknown;
    generationMode: GenerationMode;
    role: string;
    model: string;
    parentMaterialId?: string;
    regenerateTilesetId: string | null;
    pairFamilyIds: [string, string] | null;
  };
  style: ProjectStyleSpec;
  outputContract: {
    kind: string;
    width: number;
    height: number;
    columns: number;
    rows: number;
  };
  /** Provider settings (image model, aspect ratio, ...). */
  providerConfig: Record<string, unknown>;
  promptOptions: PromptOptions;
  referenceMode: ReferenceMode;
  postProcess: PostProcessOptions;
  timingsMs?: { generate?: number; postProcess?: number };
}

export interface GenerationPreviewDump {
  rawBytes: Uint8Array;
  processed: Buffer;
  model: string;
  stage: unknown;
  assetName?: unknown;
  prompt?: string;
  promptSections?: GenerationPromptSection[];
  qualificationNote?: string;
  input?: GenerationDebugInput;
  referenceImages?: DebugReferenceImage[];
  cwd?: string;
}

interface WrittenReference {
  index: number;
  tilesetId: string;
  name?: string;
  description?: string;
  width?: number;
  height?: number;
  byteLength: number;
  sha256: string;
  file: string;
  latestFile: string;
}

async function describeReference(
  image: DebugReferenceImage,
  index: number,
  prefix: string,
): Promise<WrittenReference> {
  let dimensions: { width?: number; height?: number } = {};
  try {
    const metadata = await sharp(Buffer.from(image.bytes)).metadata();
    dimensions = { width: metadata.width, height: metadata.height };
  } catch {
    dimensions = {};
  }
  return {
    index,
    tilesetId: image.tilesetId,
    name: image.name,
    description: image.description,
    ...dimensions,
    byteLength: image.bytes.byteLength,
    sha256: createHash('sha256').update(image.bytes).digest('hex'),
    file: `${prefix}-ref-${index}.png`,
    latestFile: `latest-ref-${index}.png`,
  };
}

function metricsRows(metrics: GenerationMetrics | null): string {
  if (!metrics) {
    return '';
  }
  const fixed = (value: number | undefined, digits = 3) => (
    value === undefined ? '—' : value.toFixed(digits)
  );
  const tile = (label: string, value: GenerationMetrics['raw']) => (value
    ? `<tr><th>${label}</th><td>${value.width}×${value.height}</td><td>${value.colourCount}</td><td>${fixed(value.seamRatio, 2)}</td><td>${fixed(value.isolatedPixelRatio)}</td><td>${fixed(value.meanRegionSize, 1)}</td><td>${fixed(value.internalRepeat, 2)}</td></tr>`
    : '');
  const reference = (label: string, values: GenerationMetrics['rawVsReference']) => values
    .map((value, index) => `<tr><th>${label} vs ref ${index}</th><td colspan="3">copy ${fixed(value.copyScore, 2)} (${value.copyScale}, shift ${value.copyShift.join(',')})</td><td colspan="3">colour distance ${fixed(value.meanColourDistance, 2)}</td></tr>`)
    .join('');
  return `<h2>Metrics</h2>
  <table>
    <tr><th></th><th>size</th><th>colours</th><th>seam ratio</th><th>isolated px</th><th>mean region px</th><th>internal repeat</th></tr>
    ${tile('raw', metrics.raw)}${tile('post', metrics.post)}
    ${reference('raw', metrics.rawVsReference)}${reference('post', metrics.postVsReference)}
  </table>
  <p class="hint">seam ratio ≈ 1 is invisible · isolated px and internal repeat should be low · copy near 1 means the reference layout was reused.</p>`;
}

function comparisonPage(input: {
  rawSrc: string;
  postSrc: string;
  formattedPrompt: string;
  inputJson: string;
  references: WrittenReference[];
  metrics: GenerationMetrics | null;
}): string {
  const promptBlock = input.formattedPrompt
    ? `<h2>Prompt sent to the model</h2>
  <pre>${escapeHtml(input.formattedPrompt)}</pre>`
    : '<p>No prompt was recorded for this generation.</p>';
  const references = input.references.length > 0
    ? `<h2>Reference images sent to the model</h2>
  <div class="row">${input.references.map((reference) => `
    <figure>
      <img src="${reference.latestFile}" alt="Reference ${reference.index}" />
      <figcaption>${escapeHtml(reference.name ?? reference.tilesetId)} · ${reference.width ?? '?'}×${reference.height ?? '?'} px${reference.description ? `<br />${escapeHtml(reference.description)}` : ''}</figcaption>
    </figure>`).join('')}
  </div>`
    : '<h2>Reference images sent to the model</h2><p>None.</p>';
  const inputBlock = input.inputJson
    ? `<h2>Input parameters</h2>
  <pre>${escapeHtml(input.inputJson)}</pre>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Generation debug</title>
  <style>
    body { font-family: sans-serif; margin: 24px; background: #111; color: #eee; }
    h1 { font-size: 16px; font-weight: 600; }
    h2 { font-size: 14px; font-weight: 600; margin-top: 28px; }
    .row { display: flex; gap: 24px; flex-wrap: wrap; }
    figure { margin: 0; }
    img { image-rendering: pixelated; background: #333; max-width: 512px; width: 100%; }
    figcaption { margin-top: 8px; font-size: 13px; color: #bbb; }
    table { border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #333; padding: 4px 10px; text-align: left; }
    .hint { font-size: 12px; color: #999; }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      background: #1c1c1c;
      border: 1px solid #333;
      padding: 12px 16px;
      font-size: 13px;
      line-height: 1.45;
      max-width: 960px;
    }
  </style>
</head>
<body>
  <h1>Latest AI generation vs post-process</h1>
  <p>Refresh this page after each generate. Also see timestamped copies in this folder.</p>
  <div class="row">
    <figure>
      <img src="${input.rawSrc}" alt="Raw model output" />
      <figcaption>Raw model output</figcaption>
    </figure>
    <figure>
      <img src="${input.postSrc}" alt="After post-process" />
      <figcaption>After crop / resize / palette</figcaption>
    </figure>
  </div>
  ${metricsRows(input.metrics)}
  ${inputBlock}
  ${references}
  ${promptBlock}
</body>
</html>
`;
}

async function removeStaleLatestReferences(dir: string): Promise<void> {
  const names = await readdir(dir);
  await Promise.all(names
    .filter((name) => /^latest-ref-\d+\.png$/.test(name))
    .map((name) => rm(path.join(dir, name))));
}

/**
 * Writes raw/post PNGs, the prompt, the input parameters, the reference images
 * and objective metrics under /public/generation-debug in development only.
 * Failures are logged and never thrown so generation still returns.
 */
export async function dumpGenerationPreview(
  input: GenerationPreviewDump,
): Promise<string[] | null> {
  if (!shouldDumpGenerationPreview()) {
    return null;
  }

  try {
    const dir = generationDebugDir(input.cwd);
    await mkdir(dir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stage = typeof input.stage === 'string' ? slug(input.stage) : 'stage';
    const assetName = typeof input.assetName === 'string' ? slug(input.assetName) : 'unnamed';
    const prefix = `${stamp}-${stage}-${assetName}-${slug(input.model)}`;
    const rawName = `${prefix}-raw.png`;
    const postName = `${prefix}-post.png`;
    const promptName = `${prefix}-prompt.txt`;
    const inputName = `${prefix}-input.json`;
    const rawBytes = Buffer.from(input.rawBytes);
    const prompt = typeof input.prompt === 'string' ? input.prompt : '';
    const formattedPrompt = [
      formatPromptSections(prompt, input.promptSections),
      input.qualificationNote
        ? `## Qualification\n\n${input.qualificationNote}`
        : '',
    ].filter(Boolean).join('\n\n');

    const referenceImages = input.referenceImages ?? [];
    const references = await Promise.all(
      referenceImages.map((image, index) => describeReference(image, index, prefix)),
    );
    let metrics: GenerationMetrics | null = null;
    try {
      metrics = await measureGeneration({
        raw: rawBytes,
        post: input.processed,
        references: referenceImages.map((image) => image.bytes),
      });
    } catch (error) {
      console.warn('[generation-debug] failed to compute metrics', error);
    }

    const inputDocument = input.input
      ? {
        createdAt: new Date().toISOString(),
        ...input.input,
        prompt,
        promptSections: input.promptSections,
        qualificationNote: input.qualificationNote,
        references,
        files: { raw: rawName, post: postName, prompt: promptName },
        metrics,
      }
      : null;
    const inputJson = inputDocument ? JSON.stringify(inputDocument, null, 2) : '';

    await removeStaleLatestReferences(dir);
    await writeFile(path.join(dir, rawName), rawBytes);
    await writeFile(path.join(dir, postName), input.processed);
    await writeFile(path.join(dir, promptName), formattedPrompt, 'utf8');
    await writeFile(path.join(dir, 'latest-raw.png'), rawBytes);
    await writeFile(path.join(dir, 'latest-post.png'), input.processed);
    await writeFile(path.join(dir, 'latest-prompt.txt'), formattedPrompt, 'utf8');
    if (inputJson) {
      await writeFile(path.join(dir, inputName), inputJson, 'utf8');
      await writeFile(path.join(dir, 'latest-input.json'), inputJson, 'utf8');
    }
    await Promise.all(referenceImages.flatMap((image, index) => [
      writeFile(path.join(dir, references[index].file), image.bytes),
      writeFile(path.join(dir, references[index].latestFile), image.bytes),
    ]));
    await writeFile(
      path.join(dir, 'index.html'),
      comparisonPage({
        rawSrc: 'latest-raw.png',
        postSrc: 'latest-post.png',
        formattedPrompt,
        inputJson,
        references,
        metrics,
      }),
    );

    const urls = [
      `/${DEBUG_DIR_NAME}/index.html`,
      `/${DEBUG_DIR_NAME}/latest-raw.png`,
      `/${DEBUG_DIR_NAME}/latest-post.png`,
      `/${DEBUG_DIR_NAME}/latest-prompt.txt`,
    ];
    console.info(
      `[generation-debug] wrote ${prefix}-{raw.png,post.png,prompt.txt${inputJson ? ',input.json' : ''}}. Open ${urls[0]}`,
    );
    if (inputJson) {
      console.info(`[generation-debug] input:\n${JSON.stringify({
        ...input.input,
        references: references.map(({ tilesetId, width, height, sha256 }) => ({
          tilesetId, width, height, sha256: sha256.slice(0, 12),
        })),
        metrics,
      }, null, 2)}`);
    }
    if (formattedPrompt) {
      console.info(`[generation-debug] prompt:\n${formattedPrompt}`);
    }
    return urls;
  } catch (error) {
    console.warn('[generation-debug] failed to write preview dump', error);
    return null;
  }
}
