import { GameLoop } from './GameLoop';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';
import { Scene } from './Scene';
import { MapRenderer } from './MapRenderer';
import { SpriteRenderer } from './SpriteRenderer';
import { AssetLoader } from './AssetLoader';
import type { GameProject, Map, Tileset, Character, Sprite } from '@packages/types';

export class GameEngine {
  private renderer: Renderer;
  private input: InputManager;
  private scene: Scene;
  private gameLoop: GameLoop;
  private assetLoader: AssetLoader;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    // Initialize default dimensions if 0
    if (this.renderer.getCanvas().width === 0) {
        this.renderer.getCanvas().width = 800;
        this.renderer.getCanvas().height = 600;
    }

    // Configure context for proper transparency handling
    const ctx = this.renderer.getContext();
    
    // Scale up for retro feel
    ctx.scale(2, 2);
    ctx.imageSmoothingEnabled = false;
    
    // Ensure proper alpha blending for transparent tiles
    ctx.globalCompositeOperation = 'source-over'; // Default, but explicit
    ctx.globalAlpha = 1.0; // Full opacity for drawing

    this.input = new InputManager();
    this.scene = new Scene();
    this.assetLoader = new AssetLoader();

    this.gameLoop = new GameLoop((deltaTime: number) => {
      this.renderer.clear();
      this.scene.update(deltaTime, this.input);
      this.scene.render(this.renderer);
    });
  }

  public async init(project: GameProject, maps: Map[], tilesets: Tileset[] = []) {
    console.log('🎮 GameEngine.init() CALLED');
    console.log('  → Project:', project?.name || project);
    console.log('  → Maps count:', maps?.length);
    console.log('  → Tilesets count:', tilesets?.length);
    
    // Basic setup - using the first map for now
    if (!maps || maps.length === 0) {
      console.warn('⚠️ GameEngine: No maps provided to GameEngine');
      return;
    }
    const currentMap = maps[0];
    console.log('  → Using map:', currentMap.name);

    // Find tileset
    let tileset = tilesets.find(t => t.id === currentMap.tilesetId);
    if (!tileset) {
      // Fallback
      tileset = {
        id: 'ts1', // default fallback
        name: 'Fixed Tileset',
        image_source: '/tileset_fixed.png',
        tile_width: 128,
        tile_height: 128
      };
    }

    console.log('GameEngine: Loading tileset image:', tileset.image_source);
    
    // Use AssetLoader for robust image loading
    const tilesetResult = await this.assetLoader.loadImage(tileset.image_source, {
      timeout: 15000,
      retries: 3
    });

    if (!tilesetResult.success) {
      console.error('GameEngine: Tileset load failed:', tilesetResult.error);
      console.warn('GameEngine: Using fallback tileset image');
    }

    const image = tilesetResult.asset!;
    console.log('GameEngine: Tileset image dimensions:', image.width, 'x', image.height);

    console.log('GameEngine: Initializing with map:', currentMap.name);
    console.log('GameEngine: Tileset:', tileset.name, `(${tileset.tile_width}x${tileset.tile_height})`);
    console.log('GameEngine: Map size:', `${currentMap.width}x${currentMap.height}`);
    console.log('GameEngine: Layers:', currentMap.layers.length);
    console.log('GameEngine: Layer 1 data length:', currentMap.layers[0]?.data?.length);
    
    // Use tileset's actual dimensions
    const mapRenderer = new MapRenderer(
      currentMap, 
      tileset, 
      image, 
      tileset.tile_width, 
      tileset.tile_height
    );
    this.scene.loadMap(currentMap);
    this.scene.setMapRenderer(mapRenderer);

    // Load characters from project (if any)
    if (project.characters && project.characters.length > 0) {
      console.log(`GameEngine: Loading ${project.characters.length} character(s) from project`);
      
      // TODO: For now, just load the first character as player
      // In future, support multiple characters and NPCs
      const firstCharacter = project.characters[0];
      
      // Need to find the sprite for this character
      // For now, use a default sprite if character doesn't have spriteId
      // or if sprite data isn't provided
      
      const defaultSprite: Sprite = {
        id: firstCharacter.spriteId || 'default',
        name: 'Default Character Sprite',
        image_source: '/charset_transparent.png',
        frame_width: 256, 
        frame_height: 256,
        animations: {
          idle: [0], 
          walk_down: [0, 1, 2, 3],
          walk_left: [4, 5, 6, 7],
          walk_right: [8, 9, 10, 11],
          walk_up: [12, 13, 14, 15]
        }
      };

      console.log('GameEngine: Loading character sprite:', defaultSprite.image_source);
      const spriteResult = await this.assetLoader.loadImage(defaultSprite.image_source, {
        timeout: 15000,
        retries: 3
      });

      if (!spriteResult.success) {
        console.error('GameEngine: Character sprite load failed:', spriteResult.error);
        console.warn('GameEngine: Skipping character rendering');
      } else {
        const charImage = spriteResult.asset!;
        const spriteRenderer = new SpriteRenderer(defaultSprite, charImage);
        
        // Place character at map center
        const centerX = (currentMap.width * tileset.tile_width) / 2;
        const centerY = (currentMap.height * tileset.tile_height) / 2;
        
        this.scene.addCharacter(firstCharacter, spriteRenderer, centerX, centerY);
        console.log(`GameEngine: Added character "${firstCharacter.name}" at (${centerX}, ${centerY})`);
      }
    } else {
      console.log('GameEngine: No characters in project, skipping character rendering');
    }
    
    // Expose scene for debugging
    (window as any).scene = this.scene;
  }

  public start() {
    if (!this.isRunning) {
      this.gameLoop.start();
      this.isRunning = true;
    }
  }

  public pause() {
    this.gameLoop.stop();
    this.isRunning = false;
  }

  public resume() {
    this.start();
  }

  public stop() {
    this.pause();
    this.renderer.clear();
    this.scene = new Scene();
  }
}
