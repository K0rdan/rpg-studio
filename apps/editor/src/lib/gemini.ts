/**
 * Google Gemini API Integration
 * 
 * Provides client configuration and prompt generation for AI-powered tileset generation
 * using Google's Gemini API (Nano Banana).
 */

import { GoogleGenAI } from '@google/genai';
import {
  CHARSET_GRID_COLUMNS,
  CHARSET_GRID_ROWS,
  CharsetStyle,
  TilesetStyle,
} from '@packages/types';

export type GeminiImageAspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9';

const GEMINI_IMAGE_ASPECT_RATIOS: ReadonlyArray<{
  label: GeminiImageAspectRatio;
  ratio: number;
}> = [
  { label: '9:16', ratio: 9 / 16 },
  { label: '2:3', ratio: 2 / 3 },
  { label: '3:4', ratio: 3 / 4 },
  { label: '4:5', ratio: 4 / 5 },
  { label: '1:1', ratio: 1 },
  { label: '5:4', ratio: 5 / 4 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '21:9', ratio: 21 / 9 },
];

export function getClosestGeminiImageAspectRatio(
  width: number,
  height: number,
): GeminiImageAspectRatio {
  const targetRatio = width / height;
  return GEMINI_IMAGE_ASPECT_RATIOS.reduce((closest, candidate) => {
    const closestDistance = Math.abs(Math.log(targetRatio / closest.ratio));
    const candidateDistance = Math.abs(Math.log(targetRatio / candidate.ratio));
    return candidateDistance < closestDistance ? candidate : closest;
  }).label;
}

/**
 * Get configured Gemini API client
 * @throws Error if GEMINI_API_KEY environment variable is not set
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Map style presets to detailed prompt descriptions
 */
export function getStylePrompt(style: TilesetStyle): string {
  const stylePrompts: Record<TilesetStyle, string> = {
    [TilesetStyle.MEDIEVAL]: 
      'medieval fantasy RPG tileset with stone paths, grass, cobblestone, wooden structures, castle walls, and medieval architecture elements',
    [TilesetStyle.CARTOON]: 
      'colorful cartoon-style RPG tileset with bright grass, flowers, paths, water, trees, and cheerful game world elements in a top-down view with vibrant colors and playful aesthetic',
    [TilesetStyle.FANTASY]: 
      'high fantasy RPG tileset with magical elements, enchanted forests, mystical stones, glowing crystals, and ethereal terrain',
    [TilesetStyle.SCI_FI]: 
      'futuristic sci-fi tileset with metal floors, tech panels, neon lights, circuit patterns, and cyberpunk elements',
    [TilesetStyle.DUNGEON]: 
      'dark dungeon tileset with stone floors, brick walls, torches, chains, prison bars, and underground cave elements',
    [TilesetStyle.NATURE]: 
      'natural environment tileset with various grass types, dirt, sand, water, rocks, flowers, and organic terrain',
    [TilesetStyle.URBAN]: 
      'modern urban tileset with sidewalks, roads, buildings, street elements, and city infrastructure',
    [TilesetStyle.CUSTOM]: '',
  };
  return stylePrompts[style];
}

/**
 * Build complete prompt for tileset generation
 * Combines style preset with custom refinements and technical requirements
 */
export function buildTilesetPrompt(
  style: TilesetStyle,
  tileWidth: number,
  tileHeight: number,
  customPrompt?: string
): string {
  const basePrompt = style === TilesetStyle.CUSTOM && customPrompt
    ? customPrompt
    : getStylePrompt(style);
  
  const additionalContext = customPrompt && style !== TilesetStyle.CUSTOM
    ? ` ${customPrompt}`
    : '';

  return `Create an 8-column by 8-row tileset of ${basePrompt}${additionalContext}. The image must contain exactly 64 square grid cells. Each cell represents one ${tileWidth}x${tileHeight} pixel tile for a 2D game engine. Align every tile exactly to the grid with no margins, spacing, labels, borders, or perspective distortion. Include terrain, seamless transitions, and decorative elements in a consistent top-down pixel-art style. The outer image will be resized to ${tileWidth * 8}x${tileHeight * 8} pixels, so preserve crisp hard edges and a regular grid.`;
}

export function getCharsetStylePrompt(style: CharsetStyle): string {
  const stylePrompts: Record<CharsetStyle, string> = {
    [CharsetStyle.MEDIEVAL]: 'medieval fantasy adventurer',
    [CharsetStyle.CARTOON]: 'colorful cartoon adventurer',
    [CharsetStyle.FANTASY]: 'high-fantasy hero',
    [CharsetStyle.SCI_FI]: 'futuristic sci-fi explorer',
    [CharsetStyle.MODERN]: 'modern-day character',
    [CharsetStyle.CUSTOM]: '',
  };

  return stylePrompts[style];
}

export function buildCharsetPrompt(
  style: CharsetStyle,
  frameWidth: number,
  frameHeight: number,
  customPrompt?: string,
): string {
  const basePrompt = style === CharsetStyle.CUSTOM && customPrompt
    ? customPrompt
    : getCharsetStylePrompt(style);
  const additionalContext = customPrompt && style !== CharsetStyle.CUSTOM
    ? ` ${customPrompt}`
    : '';

  const frameCount = CHARSET_GRID_COLUMNS * CHARSET_GRID_ROWS;
  return `Create one transparent-background RPG character spritesheet depicting a ${basePrompt}${additionalContext}. Use exactly ${CHARSET_GRID_COLUMNS} columns and ${CHARSET_GRID_ROWS} rows, with one full-body character pose per cell and no margins, spacing, labels, borders, shadows outside cells, or extra characters. Rows must be ordered: walking down, walking left, walking right, walking up. Each row is a three-frame seamless walk cycle, and the same character, outfit, proportions, palette, lighting, and scale must remain consistent in all ${frameCount} cells. Center the character in every cell. Crisp pixel art, orthographic game view. The final image will be resized to ${frameWidth * CHARSET_GRID_COLUMNS}x${frameHeight * CHARSET_GRID_ROWS} pixels (${frameWidth}x${frameHeight} per frame).`;
}
