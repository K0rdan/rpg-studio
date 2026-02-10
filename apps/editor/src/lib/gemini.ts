/**
 * Google Gemini API Integration
 * 
 * Provides client configuration and prompt generation for AI-powered tileset generation
 * using Google's Gemini API (Nano Banana).
 */

import { GoogleGenAI } from '@google/genai';
import { TilesetStyle } from '@packages/types';

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

  return `Create a seamless ${tileWidth}x${tileHeight} pixel tile-based ${basePrompt}${additionalContext}. The tileset should be a grid of individual tiles that can be used in a 2D game engine. Each tile should be ${tileWidth}x${tileHeight} pixels. Include variety: different terrain types, transitions, and decorative elements. Ensure tiles are seamlessly tileable and maintain consistent art style. Top-down perspective, pixel art style.`;
}
