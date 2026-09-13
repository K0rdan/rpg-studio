import { isBlockingOverlayTarget, isTypingTarget } from './keyboardTarget';

describe('isTypingTarget', () => {
  it('detects text inputs and textareas', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true);
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
  });

  it('detects contenteditable elements', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.appendChild(editable);

    expect(isTypingTarget(editable)).toBe(true);

    editable.remove();
  });

  it('ignores the canvas and other non-editing targets', () => {
    expect(isTypingTarget(document.createElement('canvas'))).toBe(false);
    expect(isTypingTarget(document.createElement('button'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe('isBlockingOverlayTarget', () => {
  it('detects the dialog itself and any element inside it', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const confirmButton = document.createElement('button');
    dialog.appendChild(confirmButton);
    document.body.appendChild(dialog);

    expect(isBlockingOverlayTarget(dialog)).toBe(true);
    expect(isBlockingOverlayTarget(confirmButton)).toBe(true);

    dialog.remove();
  });

  it('leaves canvas targets outside a dialog alone', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    expect(isBlockingOverlayTarget(canvas)).toBe(false);
    expect(isBlockingOverlayTarget(null)).toBe(false);

    canvas.remove();
  });
});
