import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { communitiesApi } from '@/domains/communities';
import * as media from '@/domains/media';
import { postsApi, type PublishPostDirectResult } from '@/domains/posts';
import { ToastProvider } from '@/shared/ui';
import { ComposeEditor } from './ComposeEditor';

function renderEditor(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>{element}</ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(communitiesApi, 'list').mockResolvedValue({
    list: [],
    hasMore: false,
    nextCursor: null,
  });
  vi.stubGlobal(
    'URL',
    class extends URL {
      static revokeObjectURL = vi.fn();
    },
  );
});
afterEach(() => {
  cleanup();
  media.useUploadQueueStore.getState().clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ComposeEditor without a router', () => {
  it('accepts page context, suppresses duplicate submissions and reports publish completion', async () => {
    const onPublished = vi.fn();
    let complete: (result: PublishPostDirectResult) => void = () => {
      throw new Error('request not started');
    };
    const publish = vi.spyOn(postsApi, 'publish').mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    vi.spyOn(postsApi, 'detail').mockRejectedValue(new Error('quote unavailable'));
    renderEditor(
      <ComposeEditor
        initialCommunityId="community-1"
        initialQuotePostId="quote-1"
        onPublished={onPublished}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: '帖子正文' }), {
      target: { value: '发布内容' },
    });
    const button = screen.getByRole('button', { name: '发布帖子' });
    fireEvent.click(button);
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const form = button.closest('form');
    if (!form) throw new Error('missing compose form');
    fireEvent.submit(form);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        bodyText: '发布内容',
        communityId: 'community-1',
        quoteOfPostId: 'quote-1',
      }),
    );
    await act(async () => {
      complete({
        postId: 'post-1',
        publishState: 'PUBLISHED',
        publishMode: 'IMMEDIATE',
        pendingMediaAssetIds: [],
      });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(onPublished).toHaveBeenCalledWith(expect.objectContaining({ postId: 'post-1' })),
    );
  });

  it('saves successful media, retains failures for retry and prevents publishing them', async () => {
    const onDraftSaved = vi.fn();
    const create = vi.spyOn(postsApi, 'createDraft').mockResolvedValue({
      draftId: 'draft-new',
      draftVersion: 1,
      saved: true,
      created: true,
      bodyTextPreview: '保留正文',
      updatedAtIso: '2026-09-18T00:00:00.000Z',
    });
    const publish = vi.spyOn(postsApi, 'publishDraft');
    vi.spyOn(media, 'uploadPostMediaQueueItem').mockImplementation(({ item }) =>
      item.status === 'ready'
        ? Promise.resolve('media-ready')
        : Promise.reject(new Error('upload failed')),
    );
    renderEditor(<ComposeEditor onDraftSaved={onDraftSaved} />);
    act(() =>
      media.useUploadQueueStore.setState({
        items: [
          {
            clientUploadId: 'ready',
            file: new File(['a'], 'ready.png', { type: 'image/png' }),
            previewUrl: 'blob:ready',
            assetKind: 'IMAGE',
            progress: 100,
            status: 'ready',
            mediaAssetId: 'media-ready',
          },
          {
            clientUploadId: 'failed',
            file: new File(['b'], 'failed.png', { type: 'image/png' }),
            previewUrl: 'blob:failed',
            assetKind: 'IMAGE',
            progress: 0,
            status: 'failed',
          },
        ],
      }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: '帖子正文' }), {
      target: { value: '保留正文' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    await waitFor(() => expect(onDraftSaved).toHaveBeenCalledWith('draft-new'));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        bodyText: '保留正文',
        mediaItems: [expect.objectContaining({ mediaAssetId: 'media-ready' })],
      }),
    );
    expect(screen.getByText('草稿已保存，部分媒体未写入')).toBeInTheDocument();
    expect(media.useUploadQueueStore.getState().items).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '发布帖子' }));
    await screen.findByText('有 1 个媒体上传失败，请重试或移除后再发布。');
    expect(publish).not.toHaveBeenCalled();
  });

  it('does not notify the page when a save completes after the editor unmounts', async () => {
    const onDraftSaved = vi.fn();
    const response = {
      draftId: 'draft-new',
      draftVersion: 1,
      saved: true as const,
      created: true as const,
      bodyTextPreview: '正文',
      updatedAtIso: '2026-09-18T00:00:00.000Z',
    };
    let complete = () => {};
    const create = vi.spyOn(postsApi, 'createDraft').mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = () => resolve(response);
        }),
    );
    const view = renderEditor(<ComposeEditor onDraftSaved={onDraftSaved} />);
    fireEvent.change(screen.getByRole('textbox', { name: '帖子正文' }), {
      target: { value: '正文' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    view.unmount();
    await act(async () => {
      complete();
      await Promise.resolve();
    });
    expect(onDraftSaved).not.toHaveBeenCalled();
  });
});
