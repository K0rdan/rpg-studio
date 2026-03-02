import { useRef, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { GameEngine } from '@packages/core';
import { useSelectionStore } from '@/stores/selectionStore';
import { useViewportStore } from '@/stores/viewportStore';
import { useMapStore } from '@/stores/mapStore';
import type { GameProject, Map, Tileset } from '@packages/types';

interface UseMapEngineReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  loading: boolean;
  error: string | null;
  currentMap: Map | null;
  currentTileset: Tileset | null;
  paintTile: (tileX: number, tileY: number, tileIndex: number) => void;
  updateMap: (map: Map) => void;
}

export function useMapEngine(projectId: string): UseMapEngineReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<GameProject | null>(null);
  const [maps, setMaps] = useState<Map[]>([]);
  const [tilesets, setTilesets] = useState<Tileset[]>([]);
  const [currentMap, setCurrentMap] = useState<Map | null>(null);
  
  const selectedId = useSelectionStore((state) => state.id);
  const selectedType = useSelectionStore((state) => state.type);
  const zoom = useViewportStore((state) => state.zoom);

  // Fetch project data
  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [projectRes, mapsRes, tilesetsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/maps`),
          fetch(`/api/tilesets?projectId=${projectId}`)
        ]);

        if (!projectRes.ok) throw new Error('Failed to fetch project');
        if (!mapsRes.ok) throw new Error('Failed to fetch maps');
        if (!tilesetsRes.ok) throw new Error('Failed to fetch tilesets');

        const projectData = await projectRes.json();
        const mapsData = await mapsRes.json();
        const tilesetsData = await tilesetsRes.json();

        setProject(projectData);
        setMaps(mapsData);
        setTilesets(tilesetsData);
        
        // Set first map as current if available
        if (mapsData.length > 0) {
          setCurrentMap(mapsData[0]);
          // Set active map ID in store
          useMapStore.getState().setActiveMapId(mapsData[0].id);
        }
      } catch (err) {
        console.error('Error fetching project data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Initialize GameEngine when canvas and data are ready
  useEffect(() => {
    if (!canvasRef.current || !project || maps.length === 0 || !currentMap) {
      return;
    }

    const initEngine = async () => {
      try {
        // Create GameEngine instance with current zoom level (disable player controls in editor)
        const engine = new GameEngine(canvasRef.current!, { scale: zoom, enablePlayerControls: false });
        engineRef.current = engine;

        // Initialize with project data
        await engine.init(project, [currentMap], tilesets);
        
        // Start rendering
        engine.start();
        
        console.log(`GameEngine initialized successfully with ${zoom}x zoom`);
      } catch (err) {
        console.error('Error initializing GameEngine:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize engine');
      }
    };

    initEngine();

    // Cleanup on unmount
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
    };
  }, [canvasRef, project, maps, tilesets, zoom]); // Removed currentMap from dependencies

  // Update map data when currentMap changes (without reinitializing engine)
  useEffect(() => {
    if (engineRef.current && currentMap) {
      engineRef.current.updateMapData(currentMap);
    }
  }, [currentMap]);

  // Handle map selection changes
  useEffect(() => {
    if (selectedType === 'map' && selectedId && engineRef.current) {
      const selectedMap = maps.find(m => m.id === selectedId);
      if (selectedMap && selectedMap.id !== currentMap?.id) {
        // Stop current engine
        engineRef.current.stop();
        
        // Update current map
        setCurrentMap(selectedMap);
        
        // Engine will re-initialize in the previous useEffect
      }
    }
  }, [selectedId, selectedType, maps, currentMap]);

  // Paint tile function
  const paintTile = (tileX: number, tileY: number, tileIndex: number) => {
    if (!currentMap || !engineRef.current) return;
    
    const activeLayer = 0; // TODO: Get from editorStore
    
    // Update map data
    const updatedMap = {
      ...currentMap,
      layers: currentMap.layers.map((layer, idx) => {
        if (idx === activeLayer) {
          const data = [...layer.data];
          const index = tileY * currentMap.width + tileX;
          
          // Bounds check
          if (index >= 0 && index < data.length) {
            data[index] = tileIndex;
          }
          
          return { ...layer, data };
        }
        return layer;
      })
    };
    
    setCurrentMap(updatedMap);
  };

  // Update map function
  const updateMap = (map: Map) => {
    setCurrentMap(map);
  };

  // Get current tileset
  const currentTileset = tilesets.length > 0 ? tilesets[0] : null;

  return {
    canvasRef,
    loading,
    error,
    currentMap,
    currentTileset,
    paintTile,
    updateMap,
  };
}
