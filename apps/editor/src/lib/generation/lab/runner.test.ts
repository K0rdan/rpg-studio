import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

import type {
  GenerationClientRequest,
  RawGenerationResult,
} from '@packages/types';

import type { GenerationClient } from '../generationErrors';
import {
  GENERATION_VARIANTS,
  LAB_CASES,
  LAB_PRESETS,
  POST_VARIANTS,
  BASELINE_GENERATION_VARIANT_ID,
  BASELINE_POST_VARIANT_ID,
} from './definitions';
import { compareRuns, renderReport, summarise } from './report';
import { applicableVariants, runLab } from './runner';

async function patternPng(size: number, seed: number): Promise<Buffer> {
  const pixels = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 3;
      const tone = ((x >> 3) + (y >> 3) + seed) % 2 === 0 ? 60 : 190;
      pixels[offset] = tone;
      pixels[offset + 1] = tone / 2 + seed;
      pixels[offset + 2] = 255 - tone;
    }
  }
  return sharp(pixels, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
}

class StubClient implements GenerationClient {
  readonly model = 'gemini' as const;
  readonly requests: GenerationClientRequest[] = [];

  isAvailable(): boolean {
    return true;
  }

  describeConfig(): Record<string, unknown> {
    return { imageModel: 'stub-image-model' };
  }

  async generate(request: GenerationClientRequest): Promise<RawGenerationResult> {
    this.requests.push(request);
    return {
      mimeType: 'image/png',
      bytes: new Uint8Array(await patternPng(256, this.requests.length)),
      model: this.model,
    };
  }
}

describe('lab definitions', () => {
  it('has unique ids and presets that only reference known ids', () => {
    for (const list of [LAB_CASES, GENERATION_VARIANTS, POST_VARIANTS]) {
      const ids = list.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    for (const preset of LAB_PRESETS) {
      expect(preset.caseIds.every((id) => LAB_CASES.some((item) => item.id === id))).toBe(true);
      expect(preset.generationVariantIds.every((id) => (
        GENERATION_VARIANTS.some((item) => item.id === id)
      ))).toBe(true);
      expect(preset.postVariantIds.every((id) => (
        POST_VARIANTS.some((item) => item.id === id)
      ))).toBe(true);
    }
    expect(GENERATION_VARIANTS.some((item) => item.id === BASELINE_GENERATION_VARIANT_ID)).toBe(true);
    expect(POST_VARIANTS.some((item) => item.id === BASELINE_POST_VARIANT_ID)).toBe(true);
  });

  it('skips reference-only variants for cases without a reference', () => {
    const base = LAB_CASES.find((item) => item.references.length === 0);
    const family = LAB_CASES.find((item) => item.references.length > 0);

    expect(base).toBeDefined();
    expect(family).toBeDefined();
    expect(applicableVariants(base!, GENERATION_VARIANTS).every((item) => !item.needsReference)).toBe(true);
    expect(applicableVariants(family!, GENERATION_VARIANTS)).toHaveLength(GENERATION_VARIANTS.length);
  });
});

jest.setTimeout(60_000);

describe('runLab', () => {
  it('runs a stubbed matrix, records inputs, and renders a comparable report', async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), 'gen-lab-'));
    const fixturesDir = path.resolve(__dirname, '../../../../scripts/generation-lab/fixtures');
    const client = new StubClient();
    const labCase = LAB_CASES.find((item) => item.id === 'water-ref32');
    const generationVariants = GENERATION_VARIANTS.filter((item) => (
      ['baseline', 'ref-scrambled', 'ref-none'].includes(item.id)
    ));
    const postVariants = POST_VARIANTS.filter((item) => (
      ['nearest-32', 'block-mc16'].includes(item.id)
    ));

    const results = await runLab({
      runId: 'unit',
      outputDir,
      fixturesDir,
      cases: [labCase!],
      generationVariants,
      postVariants,
      repeats: 2,
      concurrency: 2,
      client,
    });

    expect(results.raws).toHaveLength(6);
    expect(results.raws.every((raw) => !raw.error)).toBe(true);
    expect(results.raws.every((raw) => raw.posts.length === 2)).toBe(true);
    expect(client.requests).toHaveLength(6);
    const sentReferences = client.requests.map((request) => request.referenceImages.length);
    expect(sentReferences.filter((count) => count === 0)).toHaveLength(2);
    expect(client.requests.every((request) => request.prompt.includes('Output: 32×32 px'))).toBe(true);

    const cell = path.join(outputDir, 'cells', 'water-ref32', 'baseline', 'r1');
    const files = await readdir(cell);
    expect(files).toEqual(expect.arrayContaining([
      'raw.png',
      'prompt.txt',
      'input.json',
      'post-nearest-32.png',
      'post-nearest-32.tiled.png',
      'post-block-mc16.png',
    ]));
    const input = JSON.parse(await readFile(path.join(cell, 'input.json'), 'utf8'));
    expect(input.case.subjectDescription).toContain('water material');
    expect(input.providerConfig.imageModel).toBe('stub-image-model');
    expect((await sharp(path.join(cell, 'post-nearest-32.png')).metadata()).width).toBe(32);

    const rows = summarise(results);
    expect(rows).toHaveLength(generationVariants.length * postVariants.length);
    const html = renderReport(results);
    expect(html).toContain('Generation lab');
    expect(html).toContain('data-criterion="R1"');
    expect(compareRuns(results, results)).toContain('| baseline | nearest-32 |');
  });

  it('records a model failure without aborting the run', async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), 'gen-lab-'));
    const failing: GenerationClient = {
      model: 'gemini',
      isAvailable: () => true,
      generate: async () => {
        throw new Error('rate limited');
      },
    };

    const results = await runLab({
      runId: 'unit-fail',
      outputDir,
      fixturesDir: '',
      cases: [LAB_CASES.find((item) => item.id === 'dirt-base')!],
      generationVariants: GENERATION_VARIANTS.filter((item) => item.id === 'baseline'),
      postVariants: POST_VARIANTS.slice(0, 1),
      repeats: 1,
      client: failing,
    });

    expect(results.raws).toHaveLength(1);
    expect(results.raws[0].error).toBe('rate limited');
    expect(renderReport(results)).toContain('rate limited');
  });
});
