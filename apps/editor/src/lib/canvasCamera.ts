import type { ViewportCamera } from '@packages/types';

export interface Point {
  x: number;
  y: number;
}

interface WheelDelta {
  deltaX: number;
  deltaY: number;
  ctrlKey: boolean;
}

export const PAN_DRAG_THRESHOLD_PX = 4;

export function screenToWorld(point: Point, camera: ViewportCamera): Point {
  return {
    x: (point.x - camera.offsetX) / camera.zoom,
    y: (point.y - camera.offsetY) / camera.zoom,
  };
}

export function worldToTile(
  point: Point,
  tileWidth: number,
  tileHeight: number,
): Point {
  return {
    x: Math.floor(point.x / tileWidth),
    y: Math.floor(point.y / tileHeight),
  };
}

export function isPanFromPointerTravel(start: Point, current: Point): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y)
    > PAN_DRAG_THRESHOLD_PX;
}

export function wheelPanDelta(event: WheelDelta): Point | null {
  if (event.ctrlKey) return null;
  return { x: -event.deltaX, y: -event.deltaY };
}
