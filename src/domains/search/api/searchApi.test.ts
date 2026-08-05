import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { searchApi } from '@/domains/search';
import { server } from '@/mocks/server';
import { requireArrayItem } from '@/shared/lib/array';
import { apiSuccessResponse } from '@/test/http';

function postDetailFixture(input: {
  postId: string;
  authorHandle: string;
  postKind?: 'ORIGINAL' | 'REPLY';
  replyToPostId?: string | null;
}) {
  const authorUserId = `${input.authorHandle}-id`;
  return {
    postId: input.postId,
    authorUserId,
    postKind: input.postKind ?? ('ORIGINAL' as const),
    replyToPostId: input.replyToPostId ?? null,
    quoteOfPostId: null,
    repostOfPostId: null,
    rootPostId: input.replyToPostId ?? null,
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

describe('searchApi default MSW contract', () => {
  it('returns the canonical discriminated response for every tab', async () => {
    const posts = await searchApi.search('', 'posts', 'relevance');
    const users = await searchApi.search('', 'users', 'relevance');
    const communities = await searchApi.search('', 'communities', 'relevance');

    expect(posts.posts.list[0]).toHaveProperty('id');
    expect(users.users.list[0]).toHaveProperty('handle');
    expect(communities.communities.list[0]).toHaveProperty('slug');
  });

  it('hydrates a reply search result with its direct parent author handle', async () => {
    server.use(
      http.get('/api/search', () =>
        apiSuccessResponse({
          currentTab: 'posts' as const,
          list: [
            {
              postId: 'reply-search-1',
              authorUserId: 'replier-id',
              postKind: 'REPLY' as const,
              bodyTextPreview: '回复正文',
              visibility: 'PUBLIC' as const,
              status: 'PUBLISHED' as const,
              publishedAtIso: '2026-08-04T00:00:00.000Z',
              author: {
                userId: 'replier-id',
                handle: 'replier',
                displayName: '回复者',
                avatarUrl: null,
              },
              community: null,
              attachedMedia: [],
              linkCard: null,
              interactionSummary: null,
            },
          ],
          nextCursor: null,
        }),
      ),
      http.get('/api/posts/:postId', ({ params }) => {
        const postId = String(params.postId);
        return apiSuccessResponse(
          postId === 'reply-search-1'
            ? postDetailFixture({
                postId,
                authorHandle: 'replier',
                postKind: 'REPLY',
                replyToPostId: 'parent-search-1',
              })
            : postDetailFixture({ postId: 'parent-search-1', authorHandle: 'direct_parent' }),
        );
      }),
    );

    const result = await searchApi.search('回复正文', 'posts', 'relevance');
    const reply = requireArrayItem(result.posts.list, 0, 'reply search result');

    expect(reply).toMatchObject({
      id: 'reply-search-1',
      variant: 'search',
      relation: {
        kind: 'REPLY',
        targetPostId: 'parent-search-1',
        targetAuthor: { handle: 'direct_parent' },
        targetProfileAvailable: true,
      },
    });
  });
});
