import type { AssetFolders } from './asset-folder';

export interface GameProject {
  id: string;
  name: string;
  maps: string[]; // Array of map IDs
  characters: string[]; // Array of character IDs
  entities?: string[]; // Array of entity IDs (optional for backward compatibility)
  tilesets?: string[]; // Array of tileset IDs (optional for backward compatibility)
  sprites?: string[]; // Array of sprite IDs (project sprite library)
  assetFolders?: AssetFolders; // User-defined folders for organizing project assets
  userId: string; // Owner of the project
}
