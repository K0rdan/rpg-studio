/** Width of the vertical editor toolbar. */
export const TOOLBAR_WIDTH = 56;

/**
 * Minimum canvas width that should remain after chrome (toolbar, explorer, inspector).
 * Permissive enough for 1280px laptops while still closing the explorer on small windows.
 */
export const MIN_CANVAS_WIDTH = 640;

export interface ProjectExplorerDefaultOpenInput {
  viewportWidth: number;
  leftSidebarWidth: number;
  rightSidebarOpen: boolean;
  rightSidebarWidth: number;
}

/**
 * Whether the Project Explorer should start open given current chrome widths.
 * Uses remaining horizontal space rather than a fixed breakpoint (e.g. 1920px).
 */
export const shouldOpenProjectExplorerByDefault = ({
  viewportWidth,
  leftSidebarWidth,
  rightSidebarOpen,
  rightSidebarWidth,
}: ProjectExplorerDefaultOpenInput): boolean => {
  const inspectorWidth = rightSidebarOpen ? rightSidebarWidth : 0;
  const requiredWidth = TOOLBAR_WIDTH + leftSidebarWidth + inspectorWidth + MIN_CANVAS_WIDTH;
  return viewportWidth >= requiredWidth;
};
