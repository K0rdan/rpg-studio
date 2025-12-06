import { GameLoop, Renderer, InputManager, Scene, MapRenderer, SpriteRenderer } from '@packages/core';
import { GameLoader } from './GameLoader';
import type { Tileset, Character, Sprite } from '@packages/types';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const renderer = new Renderer(canvas);
// Scale up for retro feel
renderer.getContext().scale(2, 2);
renderer.getContext().imageSmoothingEnabled = false;

const input = new InputManager();
const scene = new Scene();
const loader = new GameLoader();

// Dummy tileset definition
const tileset: Tileset = {
  id: 'ts1',
  name: 'Fixed Tileset',
  image_source: '/tileset_fixed.png',
  tile_width: 128, // Source tile size
  tile_height: 128
};

// Dummy character
const hero: Character = {
  id: 'c1',
  name: 'Hero',
  hp: 100,
  maxHp: 100,
  attack: 10,
  defense: 5,
  spriteId: 's1'
};

// Dummy sprite
const heroSprite: Sprite = {
  id: 's1',
  name: 'Hero Sprite',
  image_source: '/charset_transparent.png',
  frame_width: 256, // Source frame size (1024 / 4)
  frame_height: 256,
  animations: {
    idle: [0], // Down Idle
    walk_down: [0, 1, 2, 3],
    walk_left: [4, 5, 6, 7],
    walk_right: [8, 9, 10, 11],
    walk_up: [12, 13, 14, 15]
  }
};

async function init() {
  try {
    const game = await loader.loadProject('/game.json');
    const map = await loader.loadMap('/' + game.maps[0]);
    
    const image = new Image();
    image.src = tileset.image_source;
    await new Promise((resolve) => { image.onload = resolve; });
    
    // Pass destination tile size (32x32) to MapRenderer
    const mapRenderer = new MapRenderer(map, tileset, image, 32, 32);
    scene.loadMap(map);
    scene.setMapRenderer(mapRenderer);
    
    // Load character sprite
    const charImage = new Image();
    charImage.src = heroSprite.image_source;
    await new Promise((resolve) => { charImage.onload = resolve; });
    
    const spriteRenderer = new SpriteRenderer(heroSprite, charImage);
    
    // Use character from game.json if available, otherwise fallback to dummy
    const playerChar = (game.characters && game.characters.length > 0 ? game.characters[0] : hero) as Character;
    
    scene.addCharacter(playerChar, spriteRenderer, 100, 100);
    
    // Expose scene for testing
    (window as any).scene = scene;
    
  } catch (e) {
    console.error(e);
  }
}

init();

const gameLoop = new GameLoop((deltaTime: number) => {
  renderer.clear();
  scene.update(deltaTime, input);
  scene.render(renderer);
});

gameLoop.start();
