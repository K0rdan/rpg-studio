import type { GameProject, Map } from '@packages/types';

export class GameLoader {
  public async loadProject(url: string): Promise<GameProject> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load project: ${response.statusText}`);
    return response.json();
  }

  public async loadMap(url: string): Promise<Map> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load map: ${response.statusText}`);
    return response.json();
  }
}
