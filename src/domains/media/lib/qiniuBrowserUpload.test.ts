import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StorageUploadTicket } from '../model/types';
import { uploadFileWithQiniu } from './qiniuBrowserUpload';

type TestQiniuWindow = typeof window & { qiniu?: unknown };

function ticket(overrides: Partial<StorageUploadTicket> = {}): StorageUploadTicket {
  return {
    token: 'upload-token',
    objectKey: 'users/current/avatar.png',
    bucket: 'media',
    uploadSessionRevision: '3',
    region: 'unknown-region',
    expiresInSeconds: 900,
    expiresAtIso: '2099-01-01T00:00:00.000Z',
    sdkScriptUrl: null,
    recommendedClientConfig: {
      useCdnDomain: true,
      checkByMD5: false,
      forceDirect: false,
      chunkSizeMB: 4,
    },
    ...overrides,
  };
}

afterEach(() => {
  delete (window as TestQiniuWindow).qiniu;
  document.querySelectorAll('script[data-media-upload-sdk]').forEach((script) => script.remove());
});

describe('uploadFileWithQiniu', () => {
  it('does not pass a raw unknown region string into the SDK config', async () => {
    const subscribe = vi.fn((observer: { complete?: (result: { key?: string }) => void }) => {
      observer.complete?.({ key: 'users/current/avatar.png' });
      return { unsubscribe: vi.fn() };
    });
    const upload = vi.fn((...args: [File, string, string, unknown, { region?: unknown }]) => {
      void args;
      return { subscribe };
    });
    (window as TestQiniuWindow).qiniu = { region: { z0: { id: 'z0' } }, upload };

    await uploadFileWithQiniu({
      file: new File(['avatar'], 'avatar.png', { type: 'image/png' }),
      ticket: ticket(),
    });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0]?.[4].region).toBeUndefined();
  });

  it('unsubscribes and reports a stable media error when the request is aborted', async () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => ({ unsubscribe }));
    const upload = vi.fn(() => ({ subscribe }));
    (window as TestQiniuWindow).qiniu = { upload };
    const controller = new AbortController();

    const pending = uploadFileWithQiniu({
      file: new File(['cover'], 'cover.png', { type: 'image/png' }),
      ticket: ticket(),
      signal: controller.signal,
    });
    await Promise.resolve();
    controller.abort('test-abort');

    await expect(pending).rejects.toMatchObject({
      code: 'MEDIA_UPLOAD_ABORTED',
      message: '媒体上传已取消。',
    });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('removes an invalid SDK script and allows the same URL to be loaded again', async () => {
    const sdkScriptUrl = '/mock-qiniu-invalid-retry.js';
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const firstUpload = uploadFileWithQiniu({
      file,
      ticket: ticket({ sdkScriptUrl }),
    });
    const firstScript = document.querySelector<HTMLScriptElement>('script[data-media-upload-sdk]');
    expect(firstScript).not.toBeNull();
    firstScript?.dispatchEvent(new Event('load'));

    await expect(firstUpload).rejects.toMatchObject({ code: 'MEDIA_UPLOAD_SDK_INVALID' });
    expect(firstScript?.isConnected).toBe(false);

    const secondUpload = uploadFileWithQiniu({
      file,
      ticket: ticket({ sdkScriptUrl }),
    });
    const secondScript = document.querySelector<HTMLScriptElement>('script[data-media-upload-sdk]');
    expect(secondScript).not.toBeNull();
    expect(secondScript).not.toBe(firstScript);

    const subscribe = vi.fn((observer: { complete?: (result: { key?: string }) => void }) => {
      observer.complete?.({ key: 'users/current/avatar.png' });
      return { unsubscribe: vi.fn() };
    });
    (window as TestQiniuWindow).qiniu = {
      upload: vi.fn(() => ({ subscribe })),
    };
    secondScript?.dispatchEvent(new Event('load'));

    await expect(secondUpload).resolves.toBeUndefined();
  });
});
