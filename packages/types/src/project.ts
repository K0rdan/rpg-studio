export interface GameProject {
  id: string;
  name: string;
  maps: string[]; // Array of map IDs
  characters: string[]; // Array of character IDs
  entities?: string[]; // Array of entity IDs (optional for backward compatibility)
  tilesets?: string[]; // Array of tileset IDs (optional for backward compatibility)
  userId: string; // Owner of the project
}
