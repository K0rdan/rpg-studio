import { useRef, useEffect, useState } from 'react';
import { GameEngine, resolveMapTileset } from '@packages/core';
import { apiFetch } from '@/lib/apiFetch';
import { DEFAULT_INACTIVE_OPACITY } from '@/lib/layerFocus';
import { clampActiveLayer, normalizeMapLayers } from '@/lib/mapLayers';
import { resolveInitialMap, selectMap } from '@/lib/mapSelection';
import { useEditorStore } from '@/stores/editorStore';
import { useMapStore } from '@/stores/mapStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useViewportStore } from '@/stores/viewportStore';
import { useTileSelectionStore } from '@/stores/tileSelectionStore';
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
  // Unsaved maps kept aside while the user works on another one, keyed by map id.
  const editedMapsRef = useRef<Record<string, Map>>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<GameProject | null>(null);
  const [maps, setMaps] = useState<Map[]>([]);
  const [tilesets, setTilesets] = useState<Tileset[]>([]);

  const currentMap = useMapStore((state) => state.currentMap);
  
  const selectedId = useSelectionStore((state) => state.id);
  const selectedType = useSelectionStore((state) => state.type);
  const zoom = useViewportStore((state) => state.zoom);
  const activeLayer = useEditorStore((state) => state.map.activeLayer);
  const isolateLayers = useEditorStore((state) => state.map.isolateLayers);

  // Fetch project data
  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [projectRes, mapsRes, tilesetsRes] = await Promise.all([
          apiFetch(`/api/projects/${projectId}`),
          apiFetch(`/api/projects/${projectId}/maps`),
          apiFetch(`/api/tilesets?projectId=${projectId}`)
        ]);

        if (!projectRes.ok) throw new Error('Failed to fetch project');
        if (!mapsRes.ok) throw new Error('Failed to fetch maps');
        if (!tilesetsRes.ok) throw new Error('Failed to fetch tilesets');

        const projectData = await projectRes.json();
        const mapsData: Map[] = await mapsRes.json();
        const tilesetsData = await tilesetsRes.json();
        const normalizedMaps = mapsData.map(normalizeMapLayers);

        setProject(projectData);
        setMaps(normalizedMaps);
        setTilesets(tilesetsData);
        
        // Open a map by default so the explorer, the inspector and the tile
        // palette all describe the same map on load.
        const { type, id } = useSelectionStore.getState();
        const initialMap = resolveInitialMap(normalizedMaps, type === 'map' ? id : null);
        if (initialMap) {
          useMapStore.getState().setCurrentMap(initialMap);
          const editor = useEditorStore.getState();
          editor.setActiveLayer(clampActiveLayer(initialMap, editor.map.activeLayer));
          editor.setIsolateLayers(false);
          selectMap(initialMap);
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
        const editor = useEditorStore.getState();
        engine.setMapViewOptions({
          focusLayerIndex: editor.map.activeLayer,
          isolate: editor.map.isolateLayers,
          inactiveOpacity: DEFAULT_INACTIVE_OPACITY,
        });

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

  useEffect(() => {
    engineRef.current?.setMapViewOptions({
      focusLayerIndex: activeLayer,
      isolate: isolateLayers,
      inactiveOpacity: DEFAULT_INACTIVE_OPACITY,
    });
  }, [activeLayer, isolateLayers]);

  // Handle map selection changes
  useEffect(() => {
    if (selectedType !== 'map' || !selectedId || !engineRef.current) return;
    if (selectedId === currentMap?.id) return;

    const selectedMap = maps.find(m => m.id === selectedId);
    if (!selectedMap) return;

    // Stop current engine
    engineRef.current.stop();

    // Remember the edits of the map we leave and restore those of the map we
    // open, so switching maps does not silently drop unsaved tiles.
    if (currentMap) {
      editedMapsRef.current[currentMap.id] = currentMap;
    }

    // Engine will re-initialize in the previous useEffect
    const nextMap = editedMapsRef.current[selectedId] ?? selectedMap;
    useMapStore.getState().setCurrentMap(nextMap);
    const editor = useEditorStore.getState();
    editor.setActiveLayer(clampActiveLayer(nextMap, editor.map.activeLayer));
    editor.setIsolateLayers(false);
  }, [selectedId, selectedType, maps, currentMap]);

  // Paint tile function
  const paintTile = (tileX: number, tileY: number, tileIndex: number) => {
    useMapStore.getState().paintTile({
      layerIndex: useEditorStore.getState().map.activeLayer,
      x: tileX,
      y: tileY,
      tileIndex,
    });
  };

  // Update map function
  const updateMap = (map: Map) => {
    useMapStore.getState().setCurrentMap(map);
  };

  // Resolve the same tileset the engine renders with, so screen-to-tile math and
  // the tile palette stay aligned with what gets painted.
  const currentTileset = currentMap ? resolveMapTileset(currentMap, tilesets) : null;
  const setSelectedTileset = useTileSelectionStore((state) => state.setSelectedTileset);

  useEffect(() => {
    if (currentTileset) {
      setSelectedTileset(currentTileset.id);
    }
  }, [currentTileset?.id, setSelectedTileset]);

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
