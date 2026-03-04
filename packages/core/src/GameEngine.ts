import { GameLoop } from './GameLoop';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';
import { Scene } from './Scene';
import { MapRenderer } from './MapRenderer';
import { SpriteRenderer } from './SpriteRenderer';
import { AssetLoader } from './AssetLoader';
import { PlayerController } from './PlayerController';
import { EntityRenderer } from './EntityRenderer';
import type { GameProject, Map, Tileset, Character, Sprite } from '@packages/types';

export class GameEngine {
  private renderer: Renderer;
  private input: InputManager;
  private scene: Scene;
  private gameLoop: GameLoop;
  private assetLoader: AssetLoader;
  private isRunning: boolean = false;
  private scale: number;
  private enablePlayerControls: boolean;
  private playerController: PlayerController | null = null;
  private entityRenderers: EntityRenderer[] = [];

  constructor(canvas: HTMLCanvasElement, options?: { scale?: number; enablePlayerControls?: boolean }) {
    this.scale = options?.scale ?? 2; // Default 2x scale for player, can be overridden for editor
    this.enablePlayerControls = options?.enablePlayerControls ?? true; // Default true for preview, false for editor
    
    this.renderer = new Renderer(canvas);
    // Initialize default dimensions if 0
    if (this.renderer.getCanvas().width === 0) {
        this.renderer.getCanvas().width = 800;
        this.renderer.getCanvas().height = 600;
    }

    // Configure context for proper transparency handling
    const ctx = this.renderer.getContext();
    
    // IMPORTANT: Reset transform to prevent cumulative scaling
    // when re-creating GameEngine with same canvas
    ctx.resetTransform();
    
    // Scale for retro feel (configurable)
    if (this.scale !== 1) {
      ctx.scale(this.scale, this.scale);
    }
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

      // Render entities (NPCs, doors, etc.)
      this.entityRenderers.forEach(renderer => {
        renderer.update(deltaTime);
        renderer.render(this.renderer);
      });

      // Render player on top (only update if controls are enabled)
      if (this.playerController) {
        if (this.enablePlayerControls) {
          this.playerController.update(deltaTime, this.input);
        }
        this.playerController.render(this.renderer);
      }
    });
  }

  public async init(project: GameProject, maps: Map[], tilesets: Tileset[] = [], sprites?: Sprite[]) {
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
        tile_width: 32,
        tile_height: 32
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

    // Load entities from map
    if (currentMap.entities && currentMap.entities.length > 0) {
      console.log(`GameEngine: Loading ${currentMap.entities.length} entity/entities from map`);

      const tw = tileset.tile_width;
      const th = tileset.tile_height;

      // Helper: load a Sprite's image and build a SpriteRenderer, or null on failure
      const loadSpriteRenderer = async (sprite: Sprite): Promise<SpriteRenderer | null> => {
        if (!sprite.image_source) return null;
        try {
          const result = await this.assetLoader.loadImage(sprite.image_source, { timeout: 10000, retries: 2 });
          if (!result.asset) return null;
          return new SpriteRenderer(sprite, result.asset);
        } catch (err) {
          console.warn(`GameEngine: Failed to load sprite "${sprite.name}":`, err);
          return null;
        }
      };

      // Find player entity
      const playerEntity = currentMap.entities.find(e => e.type === 'player');
      if (playerEntity) {
        console.log('GameEngine: Creating player controller at', playerEntity.x, playerEntity.y);
        this.playerController = new PlayerController(playerEntity, tw, th);

        // Load charset sprite for the player if one is attached
        if (playerEntity.spriteId && sprites) {
          const spriteData = sprites.find((s: Sprite) => s.id === playerEntity.spriteId);
          if (spriteData) {
            if (!spriteData.image_source) {
              // Sprite document exists in DB but URL couldn't be generated (storage offline)
              console.warn(`GameEngine: Sprite "${spriteData.name}" has no image URL — storage may be offline`);
              this.playerController.markSpriteUnavailable(spriteData.name);
            } else {
              const sr = await loadSpriteRenderer(spriteData);
              if (sr) {
                this.playerController.setSpriteRenderer(sr);
                console.log(`GameEngine: Player sprite loaded — "${spriteData.name}"`);
              } else {
                // URL was present but image load failed at runtime
                console.warn(`GameEngine: Failed to load image for sprite "${spriteData.name}"`);
                this.playerController.markSpriteUnavailable(spriteData.name);
              }
            }
          } else {
            console.warn(`GameEngine: Player sprite id="${playerEntity.spriteId}" not found in provided sprites`);
          }
        }
      } else {
        console.warn('GameEngine: No player entity found in map');
      }

      // Create renderers for non-player entities that have a sprite assigned
      const otherEntities = currentMap.entities.filter(e => e.type !== 'player');
      this.entityRenderers = await Promise.all(
        otherEntities.map(async (entity) => {
          let spriteRenderer: SpriteRenderer | null = null;
          if (entity.spriteId && sprites) {
            const spriteData = sprites.find(s => s.id === entity.spriteId);
            if (spriteData) {
              spriteRenderer = await loadSpriteRenderer(spriteData);
              if (spriteRenderer) {
                console.log(`GameEngine: Sprite loaded for entity "${entity.name}"`);
              }
            }
          }
          return new EntityRenderer(entity, spriteRenderer, tw, th);
        })
      );

      console.log(`GameEngine: Created ${this.entityRenderers.length} entity renderer(s)`);
    } else {
      console.log('GameEngine: No entities in map');
    }


    // TODO: Load entities from map and create character instances
    // The old character loading code below is commented out because project.characters
    // contains character IDs (strings), not Character objects. We'll use the entity system instead.
    
    /*
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
        console.log(`GameEngine: Added character \"${firstCharacter.name}\" at (${centerX}, ${centerY})`);
      }
    } else {
      console.log('GameEngine: No characters in project, skipping character rendering');
    }
    */
    
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

  /**
   * Update map data without reinitializing the entire engine
   * Useful for real-time editing in the editor
   */
  public updateMapData(map: Map): void {
    const mapRenderers = this.scene.getMapRenderers();
    if (mapRenderers.length > 0) {
      mapRenderers[0].updateMapData(map);
    }
  }
}
