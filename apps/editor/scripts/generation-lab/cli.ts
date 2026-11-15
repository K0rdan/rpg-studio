/**
 * Generation lab CLI. Run from apps/editor:
 *
 *   npm run lab -- list
 *   npm run lab -- run --preset smoke
 *   npm run lab -- run --cases water-ref256 --variants baseline,ref-scrambled --repeats 3
 *   npm run lab -- from-dump <path-to-dump-prefix> [--variants ...] [--repeats 2]
 *   npm run lab -- replay --raw a.png,b.png [--reference ref.png] [--post ...]
 *   npm run lab -- compare <run-a> <run-b>
 *
 * Details and the evaluation protocol: specs/022-ai-tile-generation/test-plan.md
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getGenerationClient } from '../../src/lib/generation/generationClient';
import {
  GENERATION_VARIANTS,
  LAB_CASES,
  LAB_PRESETS,
  POST_VARIANTS,
  type GenerationVariant,
  type LabCase,
  type LabPreset,
  type LabReference,
  type PostVariant,
} from '../../src/lib/generation/lab/definitions';
import { compareRuns, renderReport, summarise } from '../../src/lib/generation/lab/report';
import { runLab, type LabResults } from '../../src/lib/generation/lab/runner';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(here, 'fixtures');
const RUNS_DIR = path.resolve(here, '../../.generation-lab/runs');

type Flags = Record<string, string>;

function parseArgs(argv: string[]): { positionals: string[]; flags: Flags } {
  const positionals: string[] = [];
  const flags: Flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith('--')) {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[arg.slice(2)] = 'true';
      } else {
        flags[arg.slice(2)] = next;
        index += 1;
      }
    } else {
      positionals.push(arg);
    }
  }
  return { positionals, flags };
}

function list(flag: string | undefined): string[] | undefined {
  return flag && flag !== 'true'
    ? flag.split(',').map((value) => value.trim()).filter(Boolean)
    : undefined;
}

function pick<T extends { id: string }>(
  kind: string,
  all: T[],
  ids: string[] | undefined,
): T[] {
  if (!ids) {
    return all;
  }
  return ids.map((id) => {
    const found = all.find((candidate) => candidate.id === id);
    if (!found) {
      throw new Error(`Unknown ${kind} "${id}". Known: ${all.map((item) => item.id).join(', ')}`);
    }
    return found;
  });
}

function runId(label: string | undefined): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return label ? `${stamp}-${label.replace(/[^a-zA-Z0-9_-]+/g, '-')}` : stamp;
}

function printList(): void {
  console.log('Presets:');
  for (const preset of LAB_PRESETS) {
    console.log(`  ${preset.id.padEnd(8)} ${preset.description}`);
  }
  console.log('\nCases:');
  for (const labCase of LAB_CASES) {
    console.log(`  ${labCase.id.padEnd(16)} ${labCase.label}`);
  }
  console.log('\nGeneration variants (cost model calls):');
  for (const variant of GENERATION_VARIANTS) {
    console.log(`  ${variant.id.padEnd(16)} ${variant.label}`);
  }
  console.log('\nPost variants (free, replayed on every raw image):');
  for (const variant of POST_VARIANTS) {
    console.log(`  ${variant.id.padEnd(16)} ${variant.label}`);
  }
}

async function finish(results: LabResults, outputDir: string): Promise<void> {
  await writeFile(path.join(outputDir, 'report.html'), renderReport(results), 'utf8');
  const failed = results.raws.filter((raw) => raw.error);
  console.log(`\n${results.raws.length} raw image(s), ${failed.length} failure(s).`);
  console.log('\nvariant × post-process (means; baseline = baseline + nearest-32):');
  for (const row of summarise(results)) {
    const metrics = Object.entries(row.metrics)
      .map(([key, value]) => `${key}=${value === undefined ? '—' : value.toFixed(2)}`)
      .join(' ');
    console.log(`  ${row.generationVariantId} + ${row.postVariantId}: ${metrics}`);
  }
  console.log(`\nReport: ${path.join(outputDir, 'report.html')}`);
}

function stripDumpSuffix(value: string): string {
  return value.replace(/-(input\.json|raw\.png|post\.png|prompt\.txt)$/, '');
}

async function caseFromDump(prefix: string): Promise<{
  labCase: LabCase;
  raw: Uint8Array;
}> {
  const dir = path.dirname(prefix);
  const input = JSON.parse(await readFile(`${prefix}-input.json`, 'utf8')) as {
    resolved: { assetName?: string; category: LabCase['category']; subjectDescription: string; generationMode: string };
    style: LabCase['style'];
    references?: Array<{ file: string; description?: string; tilesetId: string }>;
  };
  if (input.resolved.generationMode !== 'texture') {
    throw new Error('The lab only replays texture generations');
  }
  const references: LabReference[] = await Promise.all((input.references ?? []).map(async (reference) => ({
    id: reference.tilesetId,
    description: reference.description ?? 'a different material',
    bytes: new Uint8Array(await readFile(path.join(dir, reference.file))),
  })));
  return {
    labCase: {
      id: 'dump',
      label: `Replay of ${input.resolved.assetName ?? path.basename(prefix)}`,
      category: input.resolved.category,
      subjectDescription: input.resolved.subjectDescription,
      generationMode: 'texture',
      style: input.style,
      references,
    },
    raw: new Uint8Array(await readFile(`${prefix}-raw.png`)),
  };
}

async function executeRun(input: {
  label?: string;
  cases: LabCase[];
  generationVariants: GenerationVariant[];
  postVariants: PostVariant[];
  repeats: number;
  concurrency: number;
  existingRaws?: Array<{ caseId: string; label: string; bytes: Uint8Array }>;
  needsModel: boolean;
}): Promise<void> {
  const client = getGenerationClient('gemini');
  if (input.needsModel && !client.isAvailable()) {
    throw new Error('GEMINI_API_KEY is missing. Put it in apps/editor/.env.local');
  }
  const id = runId(input.label);
  const outputDir = path.join(RUNS_DIR, id);
  const calls = input.needsModel
    ? input.cases.reduce((sum, labCase) => sum + input.generationVariants.filter((variant) => (
      labCase.references.length > 0 || !variant.needsReference
    )).length * input.repeats, 0)
    : 0;
  console.log(`Run ${id}: ${input.cases.length} case(s), ${calls} model call(s), ${input.postVariants.length} post variant(s).`);
  const results = await runLab({
    runId: id,
    outputDir,
    fixturesDir: FIXTURES_DIR,
    cases: input.cases,
    generationVariants: input.needsModel ? input.generationVariants : [],
    postVariants: input.postVariants,
    repeats: input.repeats,
    concurrency: input.concurrency,
    client: input.needsModel ? client : undefined,
    existingRaws: input.existingRaws,
    log: (message) => console.log(message),
  });
  await finish(results, outputDir);
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const { positionals, flags } = parseArgs(rest);
  const postVariants = pick('post variant', POST_VARIANTS, list(flags.post));
  const concurrency = Number(flags.concurrency ?? 2);

  switch (command) {
    case 'list':
      printList();
      return;
    case 'run': {
      const preset: LabPreset | undefined = flags.preset
        ? LAB_PRESETS.find((candidate) => candidate.id === flags.preset)
        : undefined;
      if (flags.preset && !preset) {
        throw new Error(`Unknown preset "${flags.preset}"`);
      }
      const caseIds = list(flags.cases) ?? preset?.caseIds;
      const variantIds = list(flags.variants) ?? preset?.generationVariantIds;
      const postIds = list(flags.post) ?? preset?.postVariantIds;
      if (!preset && !caseIds && !variantIds) {
        throw new Error('Pass --preset <id> or --cases and --variants (see `list`)');
      }
      await executeRun({
        label: flags.label ?? preset?.id,
        cases: pick('case', LAB_CASES, caseIds),
        generationVariants: pick('generation variant', GENERATION_VARIANTS, variantIds),
        postVariants: pick('post variant', POST_VARIANTS, postIds),
        repeats: Number(flags.repeats ?? preset?.repeats ?? 1),
        concurrency,
        needsModel: true,
      });
      return;
    }
    case 'from-dump': {
      const target = positionals[0];
      if (!target) {
        throw new Error('Usage: from-dump <path to a generation-debug file prefix>');
      }
      const { labCase, raw } = await caseFromDump(stripDumpSuffix(path.resolve(target)));
      await executeRun({
        label: flags.label ?? 'from-dump',
        cases: [labCase],
        generationVariants: pick('generation variant', GENERATION_VARIANTS, list(flags.variants)),
        postVariants,
        repeats: Number(flags.repeats ?? 2),
        concurrency,
        existingRaws: [{ caseId: labCase.id, label: labCase.label, bytes: raw }],
        needsModel: flags['no-model'] !== 'true',
      });
      return;
    }
    case 'replay': {
      const rawFiles = list(flags.raw);
      if (!rawFiles) {
        throw new Error('Usage: replay --raw a.png,b.png [--reference ref.png] [--tile 32]');
      }
      const referenceFile = flags.reference && flags.reference !== 'true' ? flags.reference : undefined;
      const references: LabReference[] = referenceFile
        ? [{
          id: path.basename(referenceFile, '.png'),
          description: 'reference',
          bytes: new Uint8Array(await readFile(referenceFile)),
        }]
        : [];
      const tileSize = Number(flags.tile ?? 32) as LabCase['style']['tileSize'];
      const entries = await Promise.all(rawFiles.map(async (file, index) => ({
        labCase: {
          id: `raw-${index + 1}-${path.basename(file, path.extname(file)).slice(0, 40)}`,
          label: file,
          category: 'ground',
          subjectDescription: 'replayed image',
          generationMode: 'texture',
          style: { tileSize, perspective: 'top-down' },
          references,
        } satisfies LabCase,
        bytes: new Uint8Array(await readFile(file)),
      })));
      await executeRun({
        label: flags.label ?? 'replay',
        cases: entries.map((entry) => entry.labCase),
        generationVariants: [],
        postVariants,
        repeats: 0,
        concurrency,
        existingRaws: entries.map((entry) => ({
          caseId: entry.labCase.id,
          label: entry.labCase.label,
          bytes: entry.bytes,
        })),
        needsModel: false,
      });
      return;
    }
    case 'compare': {
      const [leftDir, rightDir] = positionals;
      if (!leftDir || !rightDir) {
        throw new Error('Usage: compare <run-a> <run-b> (run ids or paths)');
      }
      const load = async (value: string) => JSON.parse(await readFile(
        path.join(path.isAbsolute(value) ? value : path.join(RUNS_DIR, value), 'results.json'),
        'utf8',
      )) as LabResults;
      console.log(compareRuns(await load(leftDir), await load(rightDir)));
      return;
    }
    default:
      console.log('Commands: list | run | from-dump | replay | compare. See the header of this file.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
