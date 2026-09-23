import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  dumpGenerationPreview,
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
      label: 'grass',
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
    const urls = await dumpGenerationPreview({
      rawBytes: raw,
      processed,
      model: 'gemini',
      stage: 'base',
      label: 'grass',
      prompt,
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
    await expect(readFile(path.join(dir, 'latest-prompt.txt'), 'utf8')).resolves.toBe(prompt);
    const html = await readFile(path.join(dir, 'index.html'), 'utf8');
    expect(html).toContain('Prompt sent to the model');
    expect(html).toContain('Create a pixel-art 2D tileset family for vegetation: grass.');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
