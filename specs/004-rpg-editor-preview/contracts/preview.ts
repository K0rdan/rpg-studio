import type { GameProject, Map, Tileset } from '@packages/types';

/**
 * Preview data structure returned by the API
 */
export interface PreviewData {
  project: GameProject;
  maps: Map[];
  tilesets: Tileset[];
}

/**
 * Asset loading result from AssetLoader
 */
export interface AssetLoadResult {
  success: boolean;
  asset?: HTMLImageElement;
  error?: string;
  path: string;
}

/**
 * Options for AssetLoader
 */
export interface AssetLoaderOptions {
  fallbackImage?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Canvas ready state for preview initialization
 */
export interface PreviewState {
  isOpen: boolean;
  isPaused: boolean;
  canvasReady: boolean;
  tilesetLoaded: boolean;
  data: PreviewData | null;
}

/**
 * Debug information displayed in preview panel
 */
export interface DebugInfo {
  mapsCount: number;
  activeMapName: string;
  tilesetId: string;
  tilesetsCount: number;
  layersCount: number;
  paintedTilesCount: number;
  mapWidth: number;
  mapHeight: number;
  tilesetLoaded: boolean;
}
