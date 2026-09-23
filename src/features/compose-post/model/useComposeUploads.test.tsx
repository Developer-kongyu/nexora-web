import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import * as media from '@/domains/media';
import { useComposeUploads } from './useComposeUploads';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('shares an active upload with submit waiting, and aborts plus clears previews on unmount', async () => {
  const revokePreview = vi.fn();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static revokeObjectURL = revokePreview;
    },
  );
  const item: media.UploadItem = {
    clientUploadId: 'upload-1',
    file: new File(['image'], 'image.png', { type: 'image/png' }),
    previewUrl: 'blob:preview',
    assetKind: 'IMAGE',
    status: 'local',
    progress: 0,
  };
  let uploadSignal: AbortSignal | undefined;
  const upload = vi.spyOn(media, 'uploadPostMediaQueueItem').mockImplementation(({ signal }) => {
    uploadSignal = signal;
    return new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  });
  const { result, unmount } = renderHook(() => useComposeUploads(0));
  act(() => media.useUploadQueueStore.setState({ items: [item] }));
  const background = result.current.startUploads([item]);
  const submit = result.current.settleUploads();
  expect(upload).toHaveBeenCalledTimes(1);
  unmount();
  expect(uploadSignal?.aborted).toBe(true);
  expect(media.useUploadQueueStore.getState().items).toEqual([]);
  expect(revokePreview).toHaveBeenCalledWith('blob:preview');
  await background;
  expect(await submit).toEqual({ mediaAssetIds: [], failedItems: [item] });
});
