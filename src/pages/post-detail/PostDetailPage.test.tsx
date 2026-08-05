import { afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/domains/auth';
import type { ReplyPostListItemView } from '@/domains/posts';
import { server } from '@/mocks/server';
import { apiSuccessResponse } from '@/test/http';
import { ToastProvider } from '@/shared/ui';
import { CommentRow, PostDetailPage } from './PostDetailPage';

afterEach(() => useAuthStore.getState().setAnonymous());

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function replyItem(input: {
  commentId: string;
  parentCommentId: string | null;
  displayName: string;
  body: string;
}): ReplyPostListItemView {
  return {
    relation: {
      commentId: input.commentId,
      authorUserId: input.commentId + '-author',
      parentCommentId: input.parentCommentId,
      topLevelCommentId: input.parentCommentId ? 'parent-comment' : null,
      depth: input.parentCommentId ? 1 : 0,
      status: 'ACTIVE',
      createdAtIso: '2026-08-04T00:00:00.000Z',
      activatedAtIso: '2026-08-04T00:00:00.000Z',
    },
    postCard: {
      postId: input.commentId + '-post',
      authorUserId: input.commentId + '-author',
      postKind: 'REPLY',
      bodyTextPreview: input.body,
      visibility: 'PUBLIC',
      status: 'PUBLISHED',
      publishedAtIso: '2026-08-04T00:00:00.000Z',
      author: {
        userId: input.commentId + '-author',
        handle: input.commentId + '-handle',
        displayName: input.displayName,
        avatarUrl: null,
      },
      community: null,
      attachedMedia: [],
      linkCard: null,
      interactionSummary: {
        likeCount: 0,
        bookmarkCount: 0,
        commentCount: 0,
        quoteCount: 0,
        repostCount: 0,
        viewerState: null,
      },
    },
    tombstone: null,
  };
}

function postDetail(input: {
  postId: string;
  handle: string;
  postKind?: 'ORIGINAL' | 'REPLY';
  replyToPostId?: string | null;
  rootPostId?: string | null;
}) {
  const authorUserId = `${input.handle}-id`;
  return {
    postId: input.postId,
    authorUserId,
    postKind: input.postKind ?? ('ORIGINAL' as const),
    replyToPostId: input.replyToPostId ?? null,
    quoteOfPostId: null,
    repostOfPostId: null,
    rootPostId: input.rootPostId ?? null,
    bodyText: `content:${input.postId}`,
    status: 'PUBLISHED' as const,
    author: {
      userId: authorUserId,
      handle: input.handle,
      displayName: input.handle,
      avatarUrl: null,
    },
    community: null,
    attachedMedia: [],
    hashtags: [],
    linkCard: null,
    interactionSummary: {
      likeCount: 0,
      bookmarkCount: 0,
      commentCount: 0,
      quoteCount: 0,
      repostCount: 0,
      viewerState: null,
    },
    interactionPermission: {
      canView: true,
      canLike: true,
      canBookmark: true,
      canComment: true,
      canQuote: true,
      canRepost: true,
    },
    publishedAtIso: '2026-08-04T00:00:00.000Z',
  };
}

describe('PostDetailPage browsing history', () => {
  it('records a community post with the community source when an authenticated viewer opens it', async () => {
    let recordedBody: unknown = null;
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'viewer-user',
        handle: 'viewer',
        displayName: 'Viewer',
        avatarUrl: null,
      },
      onboardingCompleted: true,
      onboardingStatus: 'COMPLETED',
    });

    server.use(
      http.get('/api/posts/:postId', ({ params }) => {
        const detail = postDetail({ postId: String(params.postId), handle: 'community_author' });
        return apiSuccessResponse({
          ...detail,
          community: {
            communityId: 'community-1',
            slug: 'community-one',
            displayName: 'Community One',
            avatarUrl: null,
          },
        });
      }),
      http.get('/api/posts/:postId/replies', () =>
        apiSuccessResponse({
          list: [],
          nextCursor: null,
          degraded: false,
          degradedReasons: [],
          pageMayBeShort: false,
          filteredCountHint: 0,
        }),
      ),
      http.post('/api/me/history/posts', async ({ request }) => {
        recordedBody = await request.json();
        return apiSuccessResponse({
          recorded: true,
          deduped: false,
          lastViewedAtTouched: true,
          viewCountIncremented: true,
          lastViewedAtIso: '2026-08-05T00:00:00.000Z',
          viewCount: 1,
        });
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/posts/community-post']}>
          <ToastProvider>
            <Routes>
              <Route path="/posts/:postId" element={<PostDetailPage />} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('content:community-post')).toBeInTheDocument();
    await waitFor(() =>
      expect(recordedBody).toEqual({
        postId: 'community-post',
        sourceScene: 'COMMUNITY_POST',
        sourceModule: 'COMMUNITY',
      }),
    );
  });
});
describe('PostDetailPage reply context', () => {
  it('keeps an explicit placeholder when the root post is missing but the reply is valid', async () => {
    server.use(
      http.get('/api/posts/:postId', ({ params }) => {
        const postId = String(params.postId);
        if (postId === 'missing-root-post') {
          return HttpResponse.json(
            { code: 'POST_NOT_FOUND', message: '帖子不存在', data: null },
            { status: 404 },
          );
        }
        if (postId === 'reply-post') {
          return apiSuccessResponse(
            postDetail({
              postId,
              handle: 'reply_author',
              postKind: 'REPLY',
              replyToPostId: 'parent-comment-post',
              rootPostId: 'missing-root-post',
            }),
          );
        }
        return apiSuccessResponse(
          postDetail({ postId: 'parent-comment-post', handle: 'direct_parent' }),
        );
      }),
      http.get('/api/posts/:postId/replies', () =>
        apiSuccessResponse({
          list: [],
          nextCursor: null,
          degraded: false,
          degradedReasons: [],
          pageMayBeShort: false,
          filteredCountHint: 0,
        }),
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/posts/reply-post']}>
          <ToastProvider>
            <Routes>
              <Route path="/posts/:postId" element={<PostDetailPage />} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('原帖已不存在')).toBeInTheDocument();
    expect(screen.getByText('评论所在的帖子')).toBeInTheDocument();
    expect(screen.getByText('直接回复的评论')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '@direct_parent' })).toHaveAttribute(
      'href',
      '/users/direct_parent',
    );
    expect(screen.getByText('当前回复')).toBeInTheDocument();
  });
});

describe('CommentRow direct replies', () => {
  it('opens comment detail from the body and expands children from the reply-count button', async () => {
    const parent = replyItem({
      commentId: 'parent-comment',
      parentCommentId: null,
      displayName: '父用户',
      body: '父评论内容',
    });
    const child = replyItem({
      commentId: 'child-comment',
      parentCommentId: 'parent-comment',
      displayName: '回复用户',
      body: '子回复内容',
    });
    server.use(
      http.get('/api/posts/:postId/replies', ({ request }) => {
        const parentCommentId = new URL(request.url).searchParams.get('parentCommentId');
        return apiSuccessResponse({
          list: parentCommentId === 'parent-comment' ? [child] : [],
          nextCursor: null,
          degraded: false,
          degradedReasons: [],
          pageMayBeShort: false,
          filteredCountHint: 0,
        });
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/posts/root-post']}>
          <ToastProvider>
            <CommentRow item={parent} rootPostId="root-post" onReply={() => undefined} />
            <LocationProbe />
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('button', { name: '1 条回复' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('父评论内容'));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/posts/parent-comment-post?rootPostId=root-post&commentId=parent-comment',
    );
    expect(screen.getByRole('button', { name: '查看详情' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1 条回复' }));

    expect(await screen.findByText('子回复内容')).toBeInTheDocument();
    expect(screen.getByText('回复 父用户')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '收起回复' })).toBeInTheDocument();
  });

  it('opens comment detail even when the comment has no direct replies', () => {
    const comment = replyItem({
      commentId: 'empty-comment',
      parentCommentId: null,
      displayName: '无回复用户',
      body: '没有子回复的评论',
    });
    server.use(
      http.get('/api/posts/:postId/replies', () =>
        apiSuccessResponse({
          list: [],
          nextCursor: null,
          degraded: false,
          degradedReasons: [],
          pageMayBeShort: false,
          filteredCountHint: 0,
        }),
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/posts/root-post']}>
          <ToastProvider>
            <CommentRow item={comment} rootPostId="root-post" onReply={() => undefined} />
            <LocationProbe />
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText('没有子回复的评论'));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/posts/empty-comment-post?rootPostId=root-post&commentId=empty-comment',
    );
    expect(screen.getByRole('button', { name: '查看详情' })).toBeInTheDocument();
  });
});
