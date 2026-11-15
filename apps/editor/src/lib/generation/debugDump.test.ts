import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

import { BASELINE_POST_PROCESS } from './postProcessor';
import {
  dumpGenerationPreview,
  formatPromptSections,
  shouldDumpGenerationPreview,
} from './debugDump';

describe('dumpGenerationPreview', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('is enabled only in development', () => {
    expect(shouldDumpGenerationPreview('development')).toBe(true);
    expect(shouldDumpGenerationPreview('production')).toBe(false);
    expect(shouldDumpGenerationPreview('test')).toBe(false);
  });

  it('does not write files outside development', async () => {
    process.env.NODE_ENV = 'test';
    const cwd = await mkdtemp(path.join(tmpdir(), 'gen-dump-'));

    await expect(dumpGenerationPreview({
      rawBytes: new Uint8Array([1, 2, 3]),
      processed: Buffer.from([4, 5, 6]),
      model: 'gemini',
      stage: 'base',
      assetName: 'grass',
      cwd,
    })).resolves.toBeNull();

    await expect(readdir(path.join(cwd, 'public'))).rejects.toThrow();
  });

  it('writes raw, post, latest, and comparison files in development', async () => {
    process.env.NODE_ENV = 'development';
    const cwd = await mkdtemp(path.join(tmpdir(), 'gen-dump-'));
    const raw = new Uint8Array([10, 20, 30]);
    const processed = Buffer.from([40, 50, 60]);

    const prompt = 'Create a pixel-art 2D tileset family for vegetation: grass. <script>';
    const promptSections = [
      { id: 'content' as const, title: 'Requested content', text: prompt },
      { id: 'output' as const, title: 'Output contract', text: 'Output: 256×256 px.' },
    ];
    const urls = await dumpGenerationPreview({
      rawBytes: raw,
      processed,
      model: 'gemini',
      stage: 'base',
      assetName: 'grass',
      prompt,
      promptSections,
      cwd,
    });

    expect(urls).toEqual([
      '/generation-debug/index.html',
      '/generation-debug/latest-raw.png',
      '/generation-debug/latest-post.png',
      '/generation-debug/latest-prompt.txt',
    ]);

    const dir = path.join(cwd, 'public', 'generation-debug');
    const files = await readdir(dir);
    expect(files).toEqual(expect.arrayContaining([
      'latest-raw.png',
      'latest-post.png',
      'latest-prompt.txt',
      'index.html',
    ]));
    expect(files.some((name) => name.endsWith('-raw.png') && name !== 'latest-raw.png')).toBe(true);
    expect(files.some((name) => name.endsWith('-post.png') && name !== 'latest-post.png')).toBe(true);
    expect(files.some((name) => name.endsWith('-prompt.txt') && name !== 'latest-prompt.txt')).toBe(true);
    await expect(readFile(path.join(dir, 'latest-raw.png'))).resolves.toEqual(Buffer.from(raw));
    await expect(readFile(path.join(dir, 'latest-post.png'))).resolves.toEqual(processed);
    await expect(readFile(path.join(dir, 'latest-prompt.txt'), 'utf8')).resolves.toBe(
      formatPromptSections(prompt, promptSections),
    );
    const html = await readFile(path.join(dir, 'index.html'), 'utf8');
    expect(html).toContain('Prompt sent to the model');
    expect(html).toContain('## Requested content');
    expect(html).toContain('Create a pixel-art 2D tileset family for vegetation: grass.');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('records the input parameters, reference images, and metrics', async () => {
    process.env.NODE_ENV = 'development';
    const cwd = await mkdtemp(path.join(tmpdir(), 'gen-dump-'));
    const tile = async (tone: number) => sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: tone, g: tone, b: 200 } },
    }).png().toBuffer();
    const reference = await tile(90);

    await dumpGenerationPreview({
      rawBytes: new Uint8Array(await tile(10)),
      processed: await tile(20),
      model: 'gemini',
      stage: 'family',
      assetName: 'water-gen1',
      prompt: 'flat prompt',
      referenceImages: [{
        tilesetId: 'ground-gen1',
        name: 'ground-gen1',
        description: 'cobblestone ground',
        bytes: new Uint8Array(reference),
      }],
      input: {
        request: { stage: 'family', name: 'water-gen1', sourceFamilyIds: ['ground-gen1'] },
        resolved: {
          stage: 'family',
          category: 'water',
          assetName: 'water-gen1',
          subjectDescription: 'water surface',
          generationMode: 'texture',
          role: 'family',
          model: 'gemini',
          regenerateTilesetId: null,
          pairFamilyIds: null,
        },
        style: { tileSize: 32, perspective: 'top-down' },
        outputContract: { kind: 'surface', width: 32, height: 32, columns: 1, rows: 1 },
        providerConfig: { imageModel: 'gemini-test' },
        promptOptions: {},
        referenceMode: 'full',
        postProcess: BASELINE_POST_PROCESS,
        timingsMs: { generate: 1200, postProcess: 30 },
      },
      cwd,
    });

    const dir = path.join(cwd, 'public', 'generation-debug');
    const files = await readdir(dir);
    expect(files).toEqual(expect.arrayContaining(['latest-input.json', 'latest-ref-0.png']));
    expect(files.some((name) => name.endsWith('-input.json') && name !== 'latest-input.json')).toBe(true);
    expect(files.some((name) => /-ref-0\.png$/.test(name) && name !== 'latest-ref-0.png')).toBe(true);

    const input = JSON.parse(await readFile(path.join(dir, 'latest-input.json'), 'utf8'));
    expect(input.request.sourceFamilyIds).toEqual(['ground-gen1']);
    expect(input.resolved.subjectDescription).toBe('water surface');
    expect(input.style).toEqual({ tileSize: 32, perspective: 'top-down' });
    expect(input.providerConfig.imageModel).toBe('gemini-test');
    expect(input.postProcess.downscale).toBe('nearest');
    expect(input.prompt).toBe('flat prompt');
    expect(input.references).toEqual([expect.objectContaining({
      tilesetId: 'ground-gen1',
      width: 32,
      height: 32,
      description: 'cobblestone ground',
      sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    })]);
    expect(input.metrics.post.width).toBe(32);
    expect(input.metrics.postVsReference).toHaveLength(1);
    await expect(readFile(path.join(dir, 'latest-ref-0.png'))).resolves.toEqual(reference);

    const html = await readFile(path.join(dir, 'index.html'), 'utf8');
    expect(html).toContain('Input parameters');
    expect(html).toContain('Reference images sent to the model');
    expect(html).toContain('latest-ref-0.png');
    expect(html).toContain('<h2>Metrics</h2>');
  });

  it('keeps a legacy flat prompt readable when sections are unavailable', () => {
    expect(formatPromptSections('Legacy prompt')).toBe('Legacy prompt');
  });
});
