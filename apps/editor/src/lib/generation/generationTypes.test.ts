import {
  TilesetStyle,
  isGenerationClientRequest,
  isGenerationLabel,
  isGenerationMode,
  isGenerationReferenceImage,
  isProcessedGenerationResult,
  isProjectStyleSpec,
  isTileFamilyCategory,
  isTilingMode,
} from '@packages/types';
import type {
  ProcessedGenerationResult,
  RawGenerationResult,
  Tileset,
} from '@packages/types';

import {
  createMalformedPng,
  createTileSheetPng,
} from './__tests__/imageFixtures';

const importedTilesetFixture: Tileset = {
  id: 'imported',
  name: 'Imported tiles',
  image_source: '/tiles.png',
  tile_width: 32,
  tile_height: 32,
};

const legacyGeneratedTilesetFixture: Tileset = {
  ...importedTilesetFixture,
  id: 'legacy-generated',
  generation_metadata: {
    generated: true,
    style: TilesetStyle.FANTASY,
    prompt: 'Legacy prompt',
    generated_at: new Date('2026-01-01T00:00:00.000Z'),
  },
};

const rawGenerationFixture: RawGenerationResult = {
  mimeType: 'image/png',
  bytes: new Uint8Array([137, 80, 78, 71]),
  model: 'gemini',
};

const processedGenerationFixture: ProcessedGenerationResult = {
  mimeType: 'image/png',
  bytes: new Uint8Array([137, 80, 78, 71]),
  generationMode: 'texture',
  tilingMode: 'individual',
  selfTilingScore: 0.94,
};

// @ts-expect-error Raw provider output must not be usable as a persisted tileset.
const invalidPersistedResultFixture: Tileset = rawGenerationFixture;
void invalidPersistedResultFixture;

// @ts-expect-error Processed output is not a persisted tileset.
const invalidProcessedTilesetFixture: Tileset = processedGenerationFixture;
void invalidProcessedTilesetFixture;

describe('generation type guards', () => {
  describe('isProjectStyleSpec', () => {
    it.each([16, 32, 64, 128] as const)('accepts tile size %i', (tileSize) => {
      expect(isProjectStyleSpec({ tileSize, perspective: 'top-down' })).toBe(true);
    });

    it.each(['top-down', '3/4'] as const)('accepts perspective %s', (perspective) => {
      expect(isProjectStyleSpec({ tileSize: 32, perspective })).toBe(true);
    });

    it('accepts a trimmed mood up to 200 characters', () => {
      expect(isProjectStyleSpec({
        tileSize: 32,
        perspective: '3/4',
        mood: 'x'.repeat(200),
      })).toBe(true);
    });

    it.each([
      null,
      {},
      { tileSize: 8, perspective: 'top-down' },
      { tileSize: 32.5, perspective: 'top-down' },
      { tileSize: 32, perspective: 'isometric' },
      { tileSize: 32, perspective: 'top-down', mood: '' },
      { tileSize: 32, perspective: 'top-down', mood: ' misty' },
      { tileSize: 32, perspective: 'top-down', mood: 'x'.repeat(201) },
      { tileSize: 32, perspective: 'top-down', mood: 12 },
    ])('rejects malformed style %#', (value) => {
      expect(isProjectStyleSpec(value)).toBe(false);
    });
  });

  describe('family fields', () => {
    it.each([
      'ground',
      'water',
      'elevation',
      'vegetation',
      'structure',
      'decoration',
    ])('accepts controlled category %s', (category) => {
      expect(isTileFamilyCategory(category)).toBe(true);
    });

    it.each(['', 'GROUND', 'forest', null, 1])('rejects category %#', (category) => {
      expect(isTileFamilyCategory(category)).toBe(false);
    });

    it('accepts trimmed labels from 1 through 64 characters', () => {
      expect(isGenerationLabel('g')).toBe(true);
      expect(isGenerationLabel('autumn grass')).toBe(true);
      expect(isGenerationLabel('x'.repeat(64))).toBe(true);
    });

    it.each(['', ' grass', 'grass ', 'x'.repeat(65), null, 32])(
      'rejects malformed label %#',
      (label) => {
        expect(isGenerationLabel(label)).toBe(false);
      },
    );

    it.each(['texture', 'prop'] as const)('accepts generation mode %s', (mode) => {
      expect(isGenerationMode(mode)).toBe(true);
    });

    it.each(['individual', 'fixed-block'] as const)('accepts tiling mode %s', (mode) => {
      expect(isTilingMode(mode)).toBe(true);
    });

    it.each(['Texture', 'block', '', null])('rejects unknown generation or tiling mode %#', (value) => {
      expect(isGenerationMode(value)).toBe(false);
      expect(isTilingMode(value)).toBe(false);
    });

    it('accepts a processed generation result without treating it as a tileset', () => {
      expect(isProcessedGenerationResult(processedGenerationFixture)).toBe(true);
      expect(isProcessedGenerationResult({
        mimeType: 'image/png',
        bytes: processedGenerationFixture.bytes,
        generationMode: 'prop',
        tilingMode: 'individual',
      })).toBe(true);
      expect(isProcessedGenerationResult(rawGenerationFixture)).toBe(false);
      expect(isProcessedGenerationResult({
        ...processedGenerationFixture,
        selfTilingScore: 1.4,
      })).toBe(false);
    });
  });

  describe('client request fields', () => {
    it('accepts a structured first-family request', () => {
      expect(isGenerationClientRequest({
        model: 'gemini',
        prompt: 'Generate a vegetation family.',
        referenceImages: [],
        tileSize: 32,
      })).toBe(true);
    });

    it('accepts a PNG reference backed by Uint8Array bytes', () => {
      const reference = {
        tilesetId: 'family-id',
        mimeType: 'image/png',
        bytes: new Uint8Array([137, 80, 78, 71]),
      };

      expect(isGenerationReferenceImage(reference)).toBe(true);
      expect(isGenerationClientRequest({
        model: 'gpt',
        prompt: 'Match the attached family.',
        referenceImages: [reference],
        tileSize: 16,
      })).toBe(true);
    });

    it.each([
      null,
      {},
      { model: 'unknown', prompt: 'prompt', referenceImages: [], tileSize: 32 },
      { model: 'gemini', prompt: '', referenceImages: [], tileSize: 32 },
      { model: 'gemini', prompt: ' prompt', referenceImages: [], tileSize: 32 },
      { model: 'gemini', prompt: 'prompt', referenceImages: {}, tileSize: 32 },
      { model: 'gemini', prompt: 'prompt', referenceImages: [], tileSize: 24 },
      {
        model: 'gemini',
        prompt: 'prompt',
        referenceImages: [{
          tilesetId: '',
          mimeType: 'image/jpeg',
          bytes: [137, 80, 78, 71],
        }],
        tileSize: 32,
      },
    ])('rejects malformed client request %#', (value) => {
      expect(isGenerationClientRequest(value)).toBe(false);
    });
  });

  it('constructs deterministic valid and malformed in-memory PNG fixtures', async () => {
    const first = await createTileSheetPng(16);
    const second = await createTileSheetPng(16);

    expect(first.equals(second)).toBe(true);
    expect(first.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(createMalformedPng().subarray(1, 4).toString('ascii')).not.toBe('PNG');
  });

  it('preserves imported and pre-022 generated tileset shapes', () => {
    expect(importedTilesetFixture.generation_metadata).toBeUndefined();
    expect(legacyGeneratedTilesetFixture.generation_metadata).toMatchObject({
      generated: true,
      style: 'fantasy',
      prompt: 'Legacy prompt',
    });
  });
});
