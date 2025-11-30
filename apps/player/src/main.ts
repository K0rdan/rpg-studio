import { GameLoop, Renderer, InputManager, Scene, MapRenderer, SpriteRenderer } from '@packages/core';
import { GameLoader } from './GameLoader';
import type { Tileset, Character, Sprite } from '@packages/types';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const renderer = new Renderer(canvas);
const input = new InputManager();
const scene = new Scene();
const loader = new GameLoader();

// Dummy tileset definition
const tileset: Tileset = {
  id: 'ts1',
  name: 'Basic',
  image_source: '/tileset.png',
  tile_width: 32,
  tile_height: 32
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
  image_source: '/hero.png',
  frame_width: 32,
  frame_height: 32,
  animations: {
    idle: [0],
    walk: [0, 1]
  }
};

async function init() {
  try {
    const game = await loader.loadProject('/game.json');
    const map = await loader.loadMap('/' + game.maps[0]);
    
    const image = new Image();
    image.src = tileset.image_source;
    await new Promise((resolve) => { image.onload = resolve; });
    
    const mapRenderer = new MapRenderer(map, tileset, image);
    scene.loadMap(map);
    scene.setMapRenderer(mapRenderer);
    
    // Load character sprite
    const charImage = new Image();
    charImage.src = heroSprite.image_source;
    await new Promise((resolve) => { charImage.onload = resolve; });
    
    const spriteRenderer = new SpriteRenderer(heroSprite, charImage);
    scene.addCharacter(hero, spriteRenderer, 100, 100);
    
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
