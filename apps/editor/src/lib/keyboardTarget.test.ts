import { isTypingTarget } from './keyboardTarget';

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
