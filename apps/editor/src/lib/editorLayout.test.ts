import {
  MIN_CANVAS_WIDTH,
  TOOLBAR_WIDTH,
  shouldOpenProjectExplorerByDefault,
} from './editorLayout';

const defaultChrome = {
  leftSidebarWidth: 250,
  rightSidebarOpen: true,
  rightSidebarWidth: 300,
};

const requiredWithDefaults =
  TOOLBAR_WIDTH + 250 + 300 + MIN_CANVAS_WIDTH;

describe('shouldOpenProjectExplorerByDefault', () => {
  it('opens on a standard 1920px widescreen', () => {
    expect(
      shouldOpenProjectExplorerByDefault({
        ...defaultChrome,
        viewportWidth: 1920,
      }),
    ).toBe(true);
  });

  it('opens on a 1280px laptop with default panel sizes', () => {
    expect(
      shouldOpenProjectExplorerByDefault({
        ...defaultChrome,
        viewportWidth: 1280,
      }),
    ).toBe(true);
  });

  it('stays closed when the viewport cannot fit chrome plus a usable canvas', () => {
    expect(
      shouldOpenProjectExplorerByDefault({
        ...defaultChrome,
        viewportWidth: requiredWithDefaults - 1,
      }),
    ).toBe(false);
  });

  it('opens at the exact space threshold', () => {
    expect(
      shouldOpenProjectExplorerByDefault({
        ...defaultChrome,
        viewportWidth: requiredWithDefaults,
      }),
    ).toBe(true);
  });

  it('does not reserve inspector width when the inspector is closed', () => {
    expect(
      shouldOpenProjectExplorerByDefault({
        viewportWidth: TOOLBAR_WIDTH + 250 + MIN_CANVAS_WIDTH,
        leftSidebarWidth: 250,
        rightSidebarOpen: false,
        rightSidebarWidth: 300,
      }),
    ).toBe(true);
  });
});
