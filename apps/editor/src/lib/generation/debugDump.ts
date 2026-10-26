import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

function comparisonPage(rawSrc: string, postSrc: string, prompt: string): string {
  const promptBlock = prompt
    ? `<h2>Prompt sent to the model</h2>
  <pre>${escapeHtml(prompt)}</pre>`
    : '<p>No prompt was recorded for this generation.</p>';
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
      <img src="${rawSrc}" alt="Raw model output" />
      <figcaption>Raw model output</figcaption>
    </figure>
    <figure>
      <img src="${postSrc}" alt="After post-process" />
      <figcaption>After crop / resize / 32-colour palette</figcaption>
    </figure>
  </div>
  ${promptBlock}
</body>
</html>
`;
}

export interface GenerationPreviewDump {
  rawBytes: Uint8Array;
  processed: Buffer;
  model: string;
  stage: unknown;
  assetName?: unknown;
  prompt?: string;
  cwd?: string;
}

/**
 * Writes raw/post PNGs and the prompt sent to the model under
 * /public/generation-debug in development only.
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
    const rawBytes = Buffer.from(input.rawBytes);
    const prompt = typeof input.prompt === 'string' ? input.prompt : '';

    await writeFile(path.join(dir, rawName), rawBytes);
    await writeFile(path.join(dir, postName), input.processed);
    await writeFile(path.join(dir, promptName), prompt, 'utf8');
    await writeFile(path.join(dir, 'latest-raw.png'), rawBytes);
    await writeFile(path.join(dir, 'latest-post.png'), input.processed);
    await writeFile(path.join(dir, 'latest-prompt.txt'), prompt, 'utf8');
    await writeFile(
      path.join(dir, 'index.html'),
      comparisonPage('latest-raw.png', 'latest-post.png', prompt),
    );

    const urls = [
      `/${DEBUG_DIR_NAME}/index.html`,
      `/${DEBUG_DIR_NAME}/latest-raw.png`,
      `/${DEBUG_DIR_NAME}/latest-post.png`,
      `/${DEBUG_DIR_NAME}/latest-prompt.txt`,
    ];
    console.info(
      `[generation-debug] wrote ${rawName}, ${postName}, and ${promptName}. Open ${urls[0]}`,
    );
    if (prompt) {
      console.info(`[generation-debug] prompt:\n${prompt}`);
    }
    return urls;
  } catch (error) {
    console.warn('[generation-debug] failed to write preview dump', error);
    return null;
  }
}
