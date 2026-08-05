import { http } from 'msw';
import { server } from '@/mocks/server';
import { hydratePostCardBrief, postsApi } from './postsApi';
import { apiSuccessResponse } from '@/test/http';
import { requireArrayItem } from '@/shared/lib/array';

function postDetailFixture(input: {
  postId: string;
  authorHandle: string;
  postKind?: 'ORIGINAL' | 'REPLY';
  replyToPostId?: string | null;
  rootPostId?: string | null;
}) {
  const authorUserId = `${input.authorHandle}-id`;
  return {
    postId: input.postId,
    authorUserId,
    postKind: input.postKind ?? ('ORIGINAL' as const),
    replyToPostId: input.replyToPostId ?? null,
    quoteOfPostId: null,
    repostOfPostId: null,
    rootPostId: input.rootPostId ?? null,
    bodyText: `body:${input.postId}`,
    status: 'PUBLISHED' as const,
    author: {
      userId: authorUserId,
      handle: input.authorHandle,
      displayName: input.authorHandle,
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

describe('postsApi relation contract', () => {
  it('creates and cancels a repost through the encoded post repost resource', async () => {
    const calls: Array<{
      method: string;
      pathname: string;
      idempotencyKey: string | null;
    }> = [];
    server.use(
      http.post('/api/posts/:postId/reposts', ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          idempotencyKey: request.headers.get('idempotency-key'),
        });
        return apiSuccessResponse({
          repostId: 'repost-1',
          repostPostId: 'repost-post-1',
          sourcePostId: 'post / 1',
          reposted: true as const,
          noOp: false,
        });
      }),
      http.delete('/api/posts/:postId/reposts', ({ request }) => {
        calls.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          idempotencyKey: request.headers.get('idempotency-key'),
        });
        return apiSuccessResponse({
          repostId: 'repost-1',
          sourcePostId: 'post / 1',
          canceled: true as const,
          noOp: false,
        });
      }),
    );

    await postsApi.createRepost('post / 1');
    await postsApi.cancelRepost('post / 1');

    expect(calls[0]).toMatchObject({
      method: 'POST',
      pathname: '/api/posts/post%20%2F%201/reposts',
    });
    expect(requireArrayItem(calls, 0, 'create repost call').idempotencyKey).toMatch(
      /^create-repost:/,
    );
    expect(calls[1]).toEqual({
      method: 'DELETE',
      pathname: '/api/posts/post%20%2F%201/reposts',
      idempotencyKey: null,
    });
  });

  it('hydrates a reply with the direct target author while preserving the reply id', async () => {
    server.use(
      http.get('/api/posts/:postId', ({ params }) => {
        const postId = String(params.postId);
        if (postId === 'reply-1') {
          return apiSuccessResponse(
            postDetailFixture({
              postId,
              authorHandle: 'replier',
              postKind: 'REPLY',
              replyToPostId: 'parent-1',
              rootPostId: 'root-1',
            }),
          );
        }
        return apiSuccessResponse(
          postDetailFixture({ postId: 'parent-1', authorHandle: 'parent' }),
        );
      }),
    );

    const result = await postsApi.detail('reply-1');

    expect(result).toMatchObject({
      id: 'reply-1',
      contentPostId: 'reply-1',
      relation: {
        kind: 'REPLY',
        targetPostId: 'parent-1',
        targetAuthor: { handle: 'parent' },
        targetProfileAvailable: true,
      },
    });
  });

  it('hydrates a thin reply card for collection surfaces', async () => {
    server.use(
      http.get('/api/posts/:postId', ({ params }) => {
        const postId = String(params.postId);
        return apiSuccessResponse(
          postId === 'reply-card-1'
            ? postDetailFixture({
                postId,
                authorHandle: 'replier',
                postKind: 'REPLY',
                replyToPostId: 'parent-card-1',
                rootPostId: 'missing-root-1',
              })
            : postDetailFixture({ postId: 'parent-card-1', authorHandle: 'direct_parent' }),
        );
      }),
    );

    const result = await hydratePostCardBrief(
      {
        postId: 'reply-card-1',
        authorUserId: 'replier-id',
        postKind: 'REPLY',
        bodyTextPreview: 'reply card',
        visibility: 'PUBLIC',
        status: 'PUBLISHED',
        publishedAtIso: '2026-08-04T00:00:00.000Z',
        author: null,
        community: null,
        attachedMedia: [],
        linkCard: null,
        interactionSummary: null,
      },
      'bookmark',
    );

    expect(result).toMatchObject({
      id: 'reply-card-1',
      variant: 'bookmark',
      relation: {
        targetPostId: 'parent-card-1',
        targetAuthor: { handle: 'direct_parent' },
        targetProfileAvailable: true,
      },
    });
  });

  it('reads direct comment replies through the root post replies resource', async () => {
    let requestUrl = '';
    server.use(
      http.get('/api/posts/:postId/replies', ({ request }) => {
        requestUrl = request.url;
        return apiSuccessResponse({
          list: [],
          nextCursor: null,
          degraded: false,
          degradedReasons: [],
          pageMayBeShort: false,
          filteredCountHint: 0,
        });
      }),
    );

    await postsApi.listCommentReplies('root / 1', 'comment / 1', {
      cursor: 'cursor-token',
      limit: 50,
    });

    const url = new URL(requestUrl);
    expect(url.pathname).toBe('/api/posts/root%20%2F%201/replies');
    expect(url.searchParams.get('parentCommentId')).toBe('comment / 1');
    expect(url.searchParams.get('cursor')).toBe('cursor-token');
    expect(url.searchParams.get('limit')).toBe('50');
  });
});
