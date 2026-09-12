// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AssetLoader } from './AssetLoader';

const requestedSources: string[] = [];

class StubImage {
  onload: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  private currentSrc = '';

  get src(): string {
    return this.currentSrc;
  }

  set src(value: string) {
    this.currentSrc = value;
    requestedSources.push(value);
    queueMicrotask(() => {
      if (value.startsWith('missing')) {
        this.onerror?.(new Error('stub load failure'));
      } else {
        this.onload?.();
      }
    });
  }
}

describe('AssetLoader', () => {
  let loader: AssetLoader;

  beforeEach(() => {
    requestedSources.length = 0;
    vi.stubGlobal('Image', StubImage);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    loader = new AssetLoader();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads an image and caches it', async () => {
    const first = await loader.loadImage('tiles.png', { fallbackImage: 'fallback.png' });
    const second = await loader.loadImage('tiles.png', { fallbackImage: 'fallback.png' });

    expect(first.success).toBe(true);
    expect(second.asset).toBe(first.asset);
    expect(requestedSources).toEqual(['tiles.png']);
  });

  it('retries then falls back when an image fails to load', async () => {
    const result = await loader.loadImage('missing.png', {
      fallbackImage: 'fallback.png',
      retries: 2,
      timeout: 100,
    });

    expect(result.success).toBe(false);
    expect(result.asset).toBeDefined();
    expect(requestedSources).toEqual([
      'missing.png',
      'missing.png',
      'missing.png',
      'fallback.png',
    ]);
  });

  it('goes straight to the fallback when no path is provided', async () => {
    const result = await loader.loadImage('', {
      fallbackImage: 'fallback.png',
      retries: 3,
      timeout: 100,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('no image path provided');
    expect(result.asset).toBeDefined();
    expect(requestedSources).toEqual(['fallback.png']);
  });

  it('goes straight to the fallback when the path is null', async () => {
    const result = await loader.loadImage(null as unknown as string, {
      fallbackImage: 'fallback.png',
      retries: 3,
      timeout: 100,
    });

    expect(result.success).toBe(false);
    expect(requestedSources).toEqual(['fallback.png']);
  });
});
