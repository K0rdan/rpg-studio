import { GameEngine } from '@packages/core';
import { GameLoader } from './GameLoader';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const app = new GameEngine(canvas);
const loader = new GameLoader();

// Check if embedded
const isEmbedded = window.parent !== window;

if (isEmbedded) {
  console.log('RPG Player: Running in embedded mode. Waiting for initialization...');
  
  window.addEventListener('message', async (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'INIT':
        console.log('RPG Player: Received INIT', payload);
        if (payload && payload.project && payload.maps) {
          await app.init(payload.project, payload.maps, payload.tilesets || []);
          app.start();
        }
        break;
      case 'PAUSE':
        console.log('RPG Player: Received PAUSE');
        app.pause();
        break;
      case 'RESUME':
        console.log('RPG Player: Received RESUME');
        app.resume();
        break;
      case 'STOP':
        console.log('RPG Player: Received STOP');
        app.stop();
        break;
    }
  });

  // Notify parent we are ready?
  // window.parent.postMessage({ type: 'PLAYER_READY' }, '*');

} else {
  // Standalone mode - load from game.json
  console.log('RPG Player: Running in standalone mode.');
  (async () => {
    try {
      const game = await loader.loadProject('/game.json');
      // In standalone, we assume maps are in the public folder too?
      // The loader fetches them by URL.
      // We need to fetch the maps referenced in game.json
      const maps = [];
      if (game.maps && game.maps.length > 0) {
        // Load first map for now
        const mapData = await loader.loadMap('/' + game.maps[0]);
        maps.push(mapData);
      }
      
      await app.init(game, maps);
      app.start();
    } catch (e) {
      console.error('Failed to start standalone player:', e);
    }
  })();
}

