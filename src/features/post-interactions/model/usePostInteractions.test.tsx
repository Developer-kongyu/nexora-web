import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { engagementApi } from '@/domains/engagement';
import { libraryApi, libraryKeys } from '@/domains/library';
import {
  postsApi,
  postKeys,
  type PostViewModel,
  type ReplyPostListItemView,
} from '@/domains/posts';
import { feedKeys } from '@/domains/feed';
import { searchKeys } from '@/domains/search';
import { userKeys } from '@/domains/users';
import { communityKeys } from '@/domains/communities';
import { posts } from '@/mocks/fixtures';
import { requireArrayItem } from '@/shared/lib/array';
import { ToastProvider } from '@/shared/ui';
import { useCommentLike, usePostInteractions } from './usePostInteractions';

const post: PostViewModel = {
  ...requireArrayItem(posts, 0, 'post fixture'),
  id: 'interaction-post',
  contentPostId: 'interaction-post',
  viewer: { liked: false, bookmarked: false, reposted: false },
  stats: { likes: 2, bookmarks: 3, reposts: 4, comments: 0, shares: 0, views: 0 },
  permissions: {
    canLike: true,
    canBookmark: true,
    canComment: true,
    canRepost: true,
    canQuote: true,
  },
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    );
  }
  return { client, wrapper: Wrapper };
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

afterEach(() => vi.restoreAllMocks());

describe('post interaction flow', () => {
  it('targets the source post for repost cards and blocks duplicate submissions across copies', async () => {
    const request = deferred();
    const like = vi.spyOn(engagementApi, 'like').mockReturnValue(request.promise);
    const { wrapper } = setup();
    const repost = { ...post, id: 'repost-shell', postKind: 'REPOST' as const };
    const { result } = renderHook(
      () => ({
        first: usePostInteractions(repost),
        second: usePostInteractions(post),
      }),
      { wrapper },
    );

    let submitted!: Promise<void>;
    act(() => {
      submitted = result.current.first.toggleLike();
      void result.current.second.toggleLike();
      void result.current.first.toggleLike();
    });
    await waitFor(() => expect(like).toHaveBeenCalledExactlyOnceWith('interaction-post'));
    expect(result.current.first.state).toMatchObject({ liked: true, likes: 3 });
    await waitFor(() => expect(result.current.second.pending).toBe(true));
    await act(async () => {
      request.resolve();
      await submitted;
    });
    await waitFor(() => expect(result.current.first.pending).toBe(false));
  });

  it('restores the exact optimistic state and reports failed requests', async () => {
    const request = deferred();
    vi.spyOn(engagementApi, 'unlike').mockReturnValue(request.promise);
    const { wrapper } = setup();
    const liked = {
      ...post,
      viewer: { ...post.viewer, liked: true },
      stats: { ...post.stats, likes: 0 },
    };
    const { result } = renderHook(() => usePostInteractions(liked), { wrapper });
    let submitted!: Promise<void>;
    act(() => {
      submitted = result.current.toggleLike();
    });
    expect(result.current.state).toMatchObject({ liked: false, likes: 0 });

    await act(async () => {
      request.reject(new Error('offline'));
      await submitted;
    });

    expect(result.current.state).toMatchObject({ liked: true, likes: 0 });
    expect(screen.getByText('点赞操作失败')).toBeInTheDocument();
  });

  it('does not roll a failed previous request into a newly displayed post', async () => {
    const request = deferred();
    vi.spyOn(engagementApi, 'like').mockReturnValue(request.promise);
    const { wrapper } = setup();
    const { result, rerender } = renderHook(({ displayed }) => usePostInteractions(displayed), {
      wrapper,
      initialProps: { displayed: post },
    });
    let submitted!: Promise<void>;
    act(() => {
      submitted = result.current.toggleLike();
    });
    rerender({
      displayed: {
        ...post,
        id: 'next-post',
        contentPostId: 'next-post',
        stats: { ...post.stats, likes: 10 },
      },
    });
    await act(async () => {
      request.reject(new Error('offline'));
      await submitted;
    });
    expect(result.current.state).toMatchObject({ postId: 'next-post', liked: false, likes: 10 });
  });

  it('honors all server permissions before changing state or sending requests', async () => {
    const like = vi.spyOn(engagementApi, 'like');
    const repost = vi.spyOn(postsApi, 'createRepost');
    const bookmark = vi.spyOn(libraryApi, 'savePostBookmark');
    const { wrapper } = setup();
    const { result } = renderHook(
      () =>
        usePostInteractions({
          ...post,
          permissions: {
            ...post.permissions,
            canLike: false,
            canRepost: false,
            canBookmark: false,
          },
        }),
      { wrapper },
    );
    await act(async () => {
      await result.current.toggleLike();
      await result.current.toggleRepost();
      await result.current.toggleBookmark();
    });
    expect(like).not.toHaveBeenCalled();
    expect(repost).not.toHaveBeenCalled();
    expect(bookmark).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({
      liked: false,
      reposted: false,
      bookmarked: false,
    });
  });

  it('invalidates all post surfaces and leaves drafts and unrelated account data fresh', async () => {
    vi.spyOn(engagementApi, 'like').mockResolvedValue();
    const { client, wrapper } = setup();
    const surfaces = [
      feedKeys.list('following'),
      feedKeys.list('for-you'),
      postKeys.detail(post.id),
      postKeys.replies('root-post'),
      postKeys.commentReplies('root-post', 'comment-id'),
      searchKeys.results('topic', 'posts', 'latest'),
      libraryKeys.bookmarks,
      libraryKeys.bookmarkCollectionItems('collection-1'),
      libraryKeys.history,
      libraryKeys.contentCenterPublished,
      userKeys.profilePosts('viewer'),
      communityKeys.detail('community'),
    ];
    const unrelated = [postKeys.drafts, libraryKeys.contentCenterDrafts, userKeys.editableProfile];
    for (const key of [...surfaces, ...unrelated]) client.setQueryData(key, {});
    const { result } = renderHook(() => usePostInteractions(post), { wrapper });
    await act(async () => {
      await result.current.toggleLike();
    });
    for (const key of surfaces) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of unrelated) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it('refetches mounted copies even when their normal cache lifetime is infinite', async () => {
    const confirmed = {
      ...post,
      viewer: { ...post.viewer, liked: true },
      stats: { ...post.stats, likes: 3 },
    };
    vi.spyOn(engagementApi, 'like').mockResolvedValue();
    const { client, wrapper } = setup();
    const detailKey = postKeys.detail(post.id);
    const searchKey = searchKeys.results('topic', 'posts', 'latest');
    client.setQueryData(detailKey, post);
    client.setQueryData(searchKey, { posts: { items: [post], nextCursor: null } });
    const detailRequest = vi.fn(() => Promise.resolve(confirmed));
    const searchRequest = vi.fn(() =>
      Promise.resolve({ posts: { items: [confirmed], nextCursor: null } }),
    );
    const { result } = renderHook(
      () => {
        const detail = useQuery({
          queryKey: detailKey,
          queryFn: detailRequest,
          staleTime: Infinity,
        });
        const search = useQuery({
          queryKey: searchKey,
          queryFn: searchRequest,
          staleTime: Infinity,
        });
        const interactions = usePostInteractions(detail.data ?? post);
        return { detail, search, interactions };
      },
      { wrapper },
    );

    await act(async () => {
      await result.current.interactions.toggleLike();
    });

    expect(detailRequest).toHaveBeenCalledTimes(1);
    expect(searchRequest).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.current.detail.data).toEqual(confirmed);
      expect(result.current.search.data).toEqual({
        posts: { items: [confirmed], nextCursor: null },
      });
    });
  });

  it('saves the correct bookmark source scene and supports removing the bookmark', async () => {
    const save = vi
      .spyOn(libraryApi, 'savePostBookmark')
      .mockResolvedValue({} as Awaited<ReturnType<typeof libraryApi.savePostBookmark>>);
    const remove = vi
      .spyOn(libraryApi, 'removePostBookmark')
      .mockResolvedValue({} as Awaited<ReturnType<typeof libraryApi.removePostBookmark>>);
    const { wrapper } = setup();
    const { result } = renderHook(() => usePostInteractions({ ...post, variant: 'search' }), {
      wrapper,
    });
    await act(async () => {
      await result.current.toggleBookmark();
    });
    expect(save).toHaveBeenCalledWith(post.id, {
      targetCollectionId: null,
      sourceScene: 'SEARCH_RESULT',
    });
    expect(result.current.state).toMatchObject({ bookmarked: true, bookmarks: 4 });
    await act(async () => {
      await result.current.toggleBookmark();
    });
    expect(remove).toHaveBeenCalledWith(post.id);
    expect(result.current.state).toMatchObject({ bookmarked: false, bookmarks: 3 });
  });

  it('supports repost and cancellation through the same pending and rollback flow', async () => {
    const create = vi
      .spyOn(postsApi, 'createRepost')
      .mockResolvedValue({} as Awaited<ReturnType<typeof postsApi.createRepost>>);
    const cancel = vi
      .spyOn(postsApi, 'cancelRepost')
      .mockResolvedValue({} as Awaited<ReturnType<typeof postsApi.cancelRepost>>);
    const { wrapper } = setup();
    const { result } = renderHook(() => usePostInteractions(post), { wrapper });
    await act(async () => {
      await result.current.toggleRepost();
    });
    expect(create).toHaveBeenCalledWith(post.id);
    expect(result.current.state).toMatchObject({ reposted: true, reposts: 5 });
    await act(async () => {
      await result.current.toggleRepost();
    });
    expect(cancel).toHaveBeenCalledWith(post.id);
    expect(result.current.state).toMatchObject({ reposted: false, reposts: 4 });
  });

  it('likes the reply post itself even when it carries a parent content id', async () => {
    const like = vi.spyOn(engagementApi, 'like').mockResolvedValue();
    const { wrapper } = setup();
    const { result } = renderHook(
      () => usePostInteractions({ ...post, id: 'reply-post', postKind: 'REPLY' }),
      { wrapper },
    );
    await act(async () => {
      await result.current.toggleLike();
    });
    expect(like).toHaveBeenCalledExactlyOnceWith('reply-post');
  });

  it('likes the comment post id and prevents interaction with tombstones', async () => {
    const like = vi.spyOn(engagementApi, 'like').mockResolvedValue();
    const { wrapper } = setup();
    const comment: ReplyPostListItemView = {
      relation: {
        commentId: 'relation-id',
        authorUserId: 'author',
        parentCommentId: null,
        topLevelCommentId: null,
        depth: 0,
        status: 'ACTIVE',
        createdAtIso: '',
        activatedAtIso: '',
      },
      postCard: {
        postId: 'comment-post',
        authorUserId: 'author',
        postKind: 'REPLY',
        bodyTextPreview: '',
        visibility: 'PUBLIC',
        status: 'PUBLISHED',
        publishedAtIso: null,
        author: null,
        community: null,
        attachedMedia: [],
        linkCard: null,
        interactionSummary: null,
      },
      tombstone: null,
    };
    const { result, rerender } = renderHook(({ item }) => useCommentLike(item), {
      wrapper,
      initialProps: { item: comment },
    });
    await act(async () => {
      await result.current.toggleLike();
    });
    expect(like).toHaveBeenCalledExactlyOnceWith('comment-post');
    rerender({
      item: {
        ...comment,
        relation: { ...comment.relation, status: 'DELETED' },
        postCard: null,
        tombstone: { state: 'DELETED' },
      },
    });
    await act(async () => {
      await result.current.toggleLike();
    });
    expect(result.current.canLike).toBe(false);
    expect(like).toHaveBeenCalledTimes(1);
  });
});
