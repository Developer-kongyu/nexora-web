import { http } from 'msw';
import { feedApi } from '@/domains/feed';
import { server } from '@/mocks/server';
import { apiSuccessResponse } from '@/test/http';

describe('apiClient + MSW', () => {
  it('unwraps the standard API envelope', async () => {
    const page = await feedApi.list('following');
    expect(page.list).toHaveLength(3);
    expect(page.hasMore).toBe(false);
  });

  it.each([
    ['following', '/api/feeds/following'],
    ['for-you', '/api/feeds/for-you'],
  ] as const)('uses the rebuild protocol when refreshing %s', async (tab, endpoint) => {
    const requestedUrls: URL[] = [];
    server.use(
      http.get(endpoint, ({ request }) => {
        requestedUrls.push(new URL(request.url));
        return apiSuccessResponse({ list: [], nextCursor: null, hasMore: false });
      }),
    );

    await feedApi.list(tab, undefined, undefined, 'FIRST_PAGE_REBUILD');

    expect(requestedUrls[0]?.searchParams.get('refreshMode')).toBe('FIRST_PAGE_REBUILD');
    expect(requestedUrls[0]?.searchParams.has('cursor')).toBe(false);
  });

  it('hydrates a repost shell with its original post while preserving the repost actor', async () => {
    server.use(
      http.get('/api/feeds/for-you', () =>
        apiSuccessResponse({
          list: [
            {
              postId: 'repost-1',
              dedupePostId: 'source-1',
              publishedAtIso: '2026-08-05T10:00:00.000Z',
              author: {
                userId: 'reposter-1',
                displayName: '转发者',
                handle: 'reposter',
                avatarUrl: null,
              },
              community: null,
              summary: {
                bodyText: null,
                hasImage: false,
                hasVideo: false,
                mediaCount: 0,
              },
              mediaBundle: null,
              counters: {
                likeCount: 0,
                commentCount: 0,
                quoteCount: 0,
                repostCount: 0,
                bookmarkCount: 0,
                impressionCount: 0,
                dedupedVideoViewCount: 0,
              },
              viewerState: null,
            },
          ],
          nextCursor: null,
          hasMore: false,
        }),
      ),
      http.get('/api/posts/source-1', () =>
        apiSuccessResponse({
          postId: 'source-1',
          authorUserId: 'source-author-1',
          postKind: 'ORIGINAL' as const,
          replyToPostId: null,
          quoteOfPostId: null,
          repostOfPostId: null,
          rootPostId: null,
          bodyText: '原帖正文',
          status: 'PUBLISHED' as const,
          author: {
            userId: 'source-author-1',
            handle: 'source_author',
            displayName: '原帖作者',
            avatarUrl: null,
          },
          community: null,
          attachedMedia: [],
          hashtags: [],
          linkCard: null,
          interactionSummary: {
            likeCount: 3,
            bookmarkCount: 2,
            commentCount: 1,
            quoteCount: 0,
            repostCount: 1,
            impressionCount: 9,
            dedupedVideoViewCount: 0,
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
          publishedAtIso: '2026-08-04T10:00:00.000Z',
        }),
      ),
    );

    const page = await feedApi.list('for-you');
    expect(page.list[0]).toMatchObject({
      id: 'repost-1',
      contentPostId: 'source-1',
      postKind: 'REPOST',
      content: '原帖正文',
      author: { handle: 'source_author' },
      relation: { kind: 'REPOST', actor: { handle: 'reposter' } },
      stats: { views: 9 },
    });
  });
  it.each(['HOT', 'IMAGE', 'VIDEO'] as const)(
    'requests the real explore %s bucket',
    async (tab) => {
      let requestedUrl: URL | undefined;
      server.use(
        http.get('/api/feeds/explore/posts', ({ request }) => {
          requestedUrl = new URL(request.url);
          return apiSuccessResponse({ list: [], nextCursor: null, hasMore: false });
        }),
      );

      await feedApi.explore(undefined, undefined, tab);

      expect(requestedUrl?.searchParams.get('tab')).toBe(tab);
      expect(requestedUrl?.searchParams.get('pageSize')).toBe('20');
    },
  );

  it('reads trending topics and featured communities from their backend endpoints', async () => {
    const requestedUrls: URL[] = [];
    server.use(
      http.get('/api/feeds/explore/topics', ({ request }) => {
        requestedUrls.push(new URL(request.url));
        return apiSuccessResponse({
          bucketKind: 'HOT_24H',
          list: [
            {
              hashtagText: 'backend-topic',
              hashtagNormalized: 'backend-topic',
              score: 0.8,
              postCount24h: 12,
              contributorCount24h: 4,
              freshnessBoost: 0.3,
              representativePostId: 'post-1',
              rankPosition: 1,
            },
          ],
          windowStartedAtIso: '2026-08-04T00:00:00.000Z',
          windowEndedAtIso: '2026-08-05T00:00:00.000Z',
          degradedReason: null,
        });
      }),
      http.get('/api/feeds/explore/communities', ({ request }) => {
        requestedUrls.push(new URL(request.url));
        return apiSuccessResponse({
          requestedBucketKind: 'FEATURED_BY_INTEREST',
          effectiveBucketKind: 'HOT_24H',
          personalizationApplied: false,
          personalizationSkippedReason: 'ANONYMOUS',
          list: [],
          windowStartedAtIso: '2026-08-04T00:00:00.000Z',
          windowEndedAtIso: '2026-08-05T00:00:00.000Z',
          degradedReason: null,
        });
      }),
    );

    const topics = await feedApi.exploreTopics('HOT_24H', 8);
    const communities = await feedApi.exploreCommunities('FEATURED_BY_INTEREST', 6);

    expect(topics.list[0]?.hashtagText).toBe('backend-topic');
    expect(communities.requestedBucketKind).toBe('FEATURED_BY_INTEREST');
    expect(requestedUrls[0]?.searchParams.get('bucketKind')).toBe('HOT_24H');
    expect(requestedUrls[0]?.searchParams.get('limit')).toBe('8');
    expect(requestedUrls[1]?.searchParams.get('bucketKind')).toBe('FEATURED_BY_INTEREST');
    expect(requestedUrls[1]?.searchParams.get('limit')).toBe('6');
  });

});
