import {
  PAN_DRAG_THRESHOLD_PX,
  isPanFromPointerTravel,
  screenToWorld,
  wheelPanDelta,
  worldToTile,
} from './canvasCamera';

describe('canvasCamera', () => {
  it('converts screen coordinates through pan and zoom', () => {
    expect(
      screenToWorld(
        { x: 90, y: 45 },
        { zoom: 2, offsetX: 10, offsetY: 5 },
      ),
    ).toEqual({ x: 40, y: 20 });
  });

  it('converts world coordinates to tile coordinates', () => {
    expect(worldToTile({ x: 95, y: 65 }, 32, 32)).toEqual({ x: 2, y: 2 });
  });

  it('uses a four pixel threshold to distinguish click from pan', () => {
    expect(PAN_DRAG_THRESHOLD_PX).toBe(4);
    expect(isPanFromPointerTravel({ x: 0, y: 0 }, { x: 4, y: 0 })).toBe(false);
    expect(isPanFromPointerTravel({ x: 0, y: 0 }, { x: 4.1, y: 0 })).toBe(true);
  });

  it('maps wheel movement to natural camera pan and ignores pinch zoom', () => {
    expect(wheelPanDelta({ deltaX: 12, deltaY: -8, ctrlKey: false })).toEqual({
      x: -12,
      y: 8,
    });
    expect(wheelPanDelta({ deltaX: 12, deltaY: -8, ctrlKey: true })).toBeNull();
  });
});
