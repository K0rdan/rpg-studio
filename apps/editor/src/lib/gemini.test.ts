import { CharsetStyle, TilesetStyle } from '@packages/types';
import {
  buildCharsetPrompt,
  buildTilesetPrompt,
  getClosestGeminiImageAspectRatio,
} from './gemini';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
}));

describe('Gemini image prompts', () => {
  it('builds a deterministic 8x8 tileset grid prompt', () => {
    const prompt = buildTilesetPrompt(TilesetStyle.FANTASY, 32, 32, 'volcanic');

    expect(prompt).toContain('8-column by 8-row');
    expect(prompt).toContain('32x32 pixel tile');
    expect(prompt).toContain('256x256 pixels');
    expect(prompt).toContain('volcanic');
  });

  it('builds a charset prompt matching the engine animation layout', () => {
    const prompt = buildCharsetPrompt(CharsetStyle.MEDIEVAL, 32, 64, 'red cloak');

    expect(prompt).toContain('exactly 3 columns and 4 rows');
    expect(prompt).toContain('walking down, walking left, walking right, walking up');
    expect(prompt).toContain('three-frame seamless walk cycle');
    expect(prompt).toContain('12 cells');
    expect(prompt).toContain('96x256 pixels');
    expect(prompt).toContain('red cloak');
  });

  it('uses the custom charset description as the subject', () => {
    const prompt = buildCharsetPrompt(CharsetStyle.CUSTOM, 16, 32, 'small forest witch');

    expect(prompt).toContain('small forest witch');
    expect(prompt).not.toContain('undefined');
  });

  it('chooses an image aspect ratio matching independent frame dimensions', () => {
    expect(getClosestGeminiImageAspectRatio(48, 48)).toBe('1:1');
    expect(getClosestGeminiImageAspectRatio(96, 48)).toBe('16:9');
    expect(getClosestGeminiImageAspectRatio(48, 96)).toBe('9:16');
  });
});
