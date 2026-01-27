export enum DrawingTool {
  PENCIL = 'pencil',
  RECTANGLE = 'rectangle',
  FILL = 'fill',
  EYEDROPPER = 'eyedropper',
  ERASER = 'eraser',
}

export const TOOL_LABELS: Record<DrawingTool, string> = {
  [DrawingTool.PENCIL]: 'Pencil',
  [DrawingTool.RECTANGLE]: 'Rectangle',
  [DrawingTool.FILL]: 'Fill',
  [DrawingTool.EYEDROPPER]: 'Eyedropper',
  [DrawingTool.ERASER]: 'Eraser',
};

export const TOOL_SHORTCUTS: Record<DrawingTool, string> = {
  [DrawingTool.PENCIL]: 'P',
  [DrawingTool.RECTANGLE]: 'R',
  [DrawingTool.FILL]: 'F',
  [DrawingTool.EYEDROPPER]: 'I',
  [DrawingTool.ERASER]: 'E',
};
