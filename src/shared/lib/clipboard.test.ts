import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyTextToClipboard } from './clipboard';

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function setClipboard(value: Clipboard | undefined): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value,
  });
}

afterEach(() => {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
    return;
  }
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('copyTextToClipboard', () => {
  it('invokes writeText with the Clipboard receiver', async () => {
    let receiver: Clipboard | undefined;
    const writeText = vi.fn(function (this: Clipboard, value: string) {
      receiver = this;
      return Promise.resolve(value);
    });
    const clipboard = { writeText } as unknown as Clipboard;
    setClipboard(clipboard);

    await copyTextToClipboard('https://example.com/posts/1');

    expect(writeText).toHaveBeenCalledWith('https://example.com/posts/1');
    expect(receiver).toBe(clipboard);
  });

  it('rejects when the Clipboard API is unavailable', async () => {
    setClipboard(undefined);

    await expect(copyTextToClipboard('value')).rejects.toThrow('clipboard API is unavailable');
  });
});
