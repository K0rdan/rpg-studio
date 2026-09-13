import { ZOOM_LEVELS, useViewportStore } from './viewportStore';

const resetStore = () =>
  useViewportStore.setState({ zoom: 1, offsetX: 0, offsetY: 0 });

const camera = () => {
  const { zoom, offsetX, offsetY } = useViewportStore.getState();
  return { zoom, offsetX, offsetY };
};

describe('viewportStore', () => {
  beforeEach(resetStore);

  it('starts on the identity camera', () => {
    expect(camera()).toEqual({ zoom: 1, offsetX: 0, offsetY: 0 });
  });

  it('steps through the supported zoom levels', () => {
    useViewportStore.getState().zoomIn();
    expect(camera().zoom).toBe(2);

    useViewportStore.getState().zoomOut();
    useViewportStore.getState().zoomOut();
    expect(camera().zoom).toBe(0.5);
  });

  it('stops at the first and last zoom level', () => {
    const [minZoom] = ZOOM_LEVELS;
    const maxZoom = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];

    useViewportStore.setState({ zoom: maxZoom });
    useViewportStore.getState().zoomIn();
    expect(camera().zoom).toBe(maxZoom);

    useViewportStore.setState({ zoom: minZoom });
    useViewportStore.getState().zoomOut();
    expect(camera().zoom).toBe(minZoom);
  });

  it('clamps an explicit zoom to the supported range', () => {
    useViewportStore.getState().setZoom(99 as never);
    expect(camera().zoom).toBe(ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);

    useViewportStore.getState().setZoom(0.01 as never);
    expect(camera().zoom).toBe(ZOOM_LEVELS[0]);
  });

  it('accumulates pan deltas', () => {
    useViewportStore.getState().pan(20, -10);
    useViewportStore.getState().pan(5, 30);

    expect(camera()).toEqual({ zoom: 1, offsetX: 25, offsetY: 20 });
  });

  it('keeps the pan offset when only the zoom is reset', () => {
    useViewportStore.setState({ zoom: 4, offsetX: 120, offsetY: -60 });
    useViewportStore.getState().resetZoom();

    expect(camera()).toEqual({ zoom: 1, offsetX: 120, offsetY: -60 });
  });

  it('clears zoom and pan when the whole viewport is reset', () => {
    useViewportStore.setState({ zoom: 4, offsetX: 120, offsetY: -60 });
    useViewportStore.getState().resetViewport();

    expect(camera()).toEqual({ zoom: 1, offsetX: 0, offsetY: 0 });
  });
});
