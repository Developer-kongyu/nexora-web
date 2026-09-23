import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { feedKeys } from '@/domains/feed/model';
import {
  buildPostComposeInput,
  postKeys,
  postsApi,
  type PostDraftDetailView,
  type SavePostDraftResult,
} from '@/domains/posts';
import { ApiError } from '@/shared/api/errors';
import { useDraftAutosave } from './useDraftAutosave';
import { usePublishPost } from './usePublishPost';

const savedAt = '2026-09-18T00:00:00.000Z';
const compose = buildPostComposeInput({
  mediaAssetIds: [],
  visibility: null,
  bodyText: '原始草稿',
});
function draft(): PostDraftDetailView {
  return {
    draftId: 'draft-1',
    draftVersion: 4,
    state: 'EDITABLE',
    composeSnapshot: { ...compose, bodyTextNormalized: compose.bodyText },
    validationDiagnostics: null,
    linkPreviewState: { state: 'NONE', card: null },
    updatedAtIso: savedAt,
    lastAutosavedAtIso: null,
    lastSavedAtIso: savedAt,
  };
}
function saved(draftVersion: number): SavePostDraftResult {
  return {
    draftId: 'draft-1',
    draftVersion,
    saved: true,
    reason: 'UPDATED',
    updatedAtIso: savedAt,
  };
}
function testProvider() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('compose publishing', () => {
  it('submits once and refreshes feed plus the published draft caches', async () => {
    const { client, wrapper } = testProvider();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const publish = vi.spyOn(postsApi, 'publishDraft').mockResolvedValue({
      draftId: 'draft-1',
      postId: 'post-1',
      publishState: 'PUBLISHED',
      publishMode: 'IMMEDIATE',
      pendingMediaAssetIds: [],
    });
    const { result } = renderHook(() => usePublishPost(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ draftId: 'draft-1' });
    });
    expect(publish).toHaveBeenCalledExactlyOnceWith('draft-1', { allowWaitingMediaPublish: true });
    expect(invalidate.mock.calls.map(([options]) => options?.queryKey)).toEqual([
      feedKeys.all,
      postKeys.drafts,
      postKeys.draftDetail('draft-1'),
    ]);
  });

  it('preserves waiting-media publishing and only invalidates caches after success', async () => {
    const { client, wrapper } = testProvider();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const publish = vi
      .spyOn(postsApi, 'publish')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        postId: 'post-1',
        publishState: 'PUBLISHING',
        publishMode: 'WAIT_MEDIA_READY',
        pendingMediaAssetIds: ['media-1'],
      });
    const { result } = renderHook(() => usePublishPost(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ compose })).rejects.toThrow('offline');
    });
    expect(invalidate).not.toHaveBeenCalled();
    await act(async () => {
      expect(await result.current.mutateAsync({ compose })).toMatchObject({
        publishState: 'PUBLISHING',
      });
    });
    expect(publish).toHaveBeenLastCalledWith({ ...compose, allowWaitingMediaPublish: true });
    expect(invalidate.mock.calls.map(([options]) => options?.queryKey)).toEqual([
      feedKeys.all,
      postKeys.drafts,
    ]);
  });
});

describe('draft save lifecycle', () => {
  it('debounces the latest edit, then uses the new version for the next save', async () => {
    vi.useFakeTimers();
    const autosave = vi.spyOn(postsApi, 'autosaveDraft').mockResolvedValue(saved(5));
    const save = vi.spyOn(postsApi, 'saveDraft').mockResolvedValue(saved(6));
    const firstEdit = buildPostComposeInput({
      mediaAssetIds: [],
      visibility: null,
      bodyText: '第一次修改',
    });
    const latestEdit = buildPostComposeInput({
      mediaAssetIds: [],
      visibility: null,
      bodyText: '最后修改',
    });
    const { wrapper } = testProvider();
    const { result, rerender } = renderHook(
      (snapshot) => useDraftAutosave({ initialDraft: draft(), compose: snapshot, blocked: false }),
      { wrapper, initialProps: firstEdit },
    );
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    rerender(latestEdit);
    await act(() => vi.advanceTimersByTimeAsync(1_499));
    expect(autosave).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(autosave).toHaveBeenCalledExactlyOnceWith('draft-1', 4, latestEdit);
    expect(result.current.saveState).toBe('saved');
    await act(async () => {
      await result.current.saveCompose(firstEdit);
    });
    expect(save).toHaveBeenCalledExactlyOnceWith('draft-1', 5, firstEdit);
  });

  it('waits for the first manual save and cancels the pending timer on unmount', async () => {
    vi.useFakeTimers();
    const autosave = vi.spyOn(postsApi, 'autosaveDraft');
    const create = vi.spyOn(postsApi, 'createDraft').mockResolvedValue({
      draftId: 'draft-1',
      draftVersion: 1,
      saved: true,
      created: true,
      bodyTextPreview: '原始草稿',
      updatedAtIso: savedAt,
    });
    const { wrapper } = testProvider();
    const { result, rerender, unmount } = renderHook(
      (snapshot) => useDraftAutosave({ initialDraft: null, compose: snapshot, blocked: false }),
      { wrapper, initialProps: compose },
    );
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(create).not.toHaveBeenCalled();
    expect(autosave).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.saveCompose(compose);
    });
    rerender(
      buildPostComposeInput({ mediaAssetIds: [], visibility: null, bodyText: '卸载前修改' }),
    );
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(autosave).not.toHaveBeenCalled();
  });

  it('pauses autosave during explicit actions and exposes version conflicts without a retry loop', async () => {
    vi.useFakeTimers();
    const conflict = new ApiError({
      httpStatus: 409,
      code: 'POST_DRAFT_VERSION_CONFLICT',
      message: 'conflict',
    });
    const autosave = vi.spyOn(postsApi, 'autosaveDraft').mockRejectedValue(conflict);
    const { wrapper } = testProvider();
    const changed = buildPostComposeInput({
      mediaAssetIds: [],
      visibility: null,
      bodyText: '修改后',
    });
    const { result, rerender } = renderHook(
      (blocked) => useDraftAutosave({ initialDraft: draft(), compose: changed, blocked }),
      { wrapper, initialProps: true },
    );
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(autosave).not.toHaveBeenCalled();
    rerender(false);
    await act(() => vi.advanceTimersByTimeAsync(1_500));
    expect(result.current.saveError).toContain('草稿已在其他位置更新');
    expect(result.current.saveState).toBe('error');
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(autosave).toHaveBeenCalledTimes(1);
  });
});
