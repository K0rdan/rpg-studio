/**
 * Editor shortcuts listen on `window`, so they also receive key events coming from
 * dialogs and form fields rendered above the canvas. Those keys must keep their
 * native behaviour instead of driving the canvas.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || target.closest('[contenteditable="true"]') !== null;
}

/**
 * Dialogs render above the canvas and keep their own keyboard handling, so canvas
 * shortcuts must stay inert while one of them owns the focused element.
 */
export function isBlockingOverlayTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[role="dialog"]') !== null;
}
