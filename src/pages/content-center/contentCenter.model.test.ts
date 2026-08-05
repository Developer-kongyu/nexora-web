import { http } from 'msw';
import type { ContentCenterPublishedPageView } from '@/domains/library';
import type { PostCardBriefView, PostDetailDto, PostKind } from '@/domains/posts';
import { server } from '@/mocks/server';
import { apiSuccessResponse } from '@/test/http';
import { hydrateContentCenterPublishedPage } from './contentCenter.model';

function postDetailFixture(input: {
  postId: string;
  authorHandle: string;
  postKind?: PostKind;
  bodyText?: string | null;
  repostOfPostId?: string | null;
}): PostDetailDto {
  const authorUserId = `${input.authorHandle}-id`;
  return {
    postId: input.postId,
    authorUserId,
    postKind: input.postKind ?? 'ORIGINAL',
    replyToPostId: null,
    quoteOfPostId: null,
    repostOfPostId: input.repostOfPostId ?? null,
    rootPostId: null,
    bodyText: input.bodyText === undefined ? `正文:${input.postId}` : input.bodyText,
    status: 'PUBLISHED',
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
    publishedAtIso: '2026-08-05T00:00:00.000Z',
  };
}

const thinRepostCard: PostCardBriefView = {
  postId: 'repost-1',
  authorUserId: 'reposter-id',
  postKind: 'REPOST',
  bodyTextPreview: null,
  visibility: 'PUBLIC',
  status: 'PUBLISHED',
  publishedAtIso: '2026-08-05T00:00:00.000Z',
  author: {
    userId: 'reposter-id',
    handle: 'reposter',
    displayName: '转发者',
    avatarUrl: null,
  },
  community: null,
  attachedMedia: [],
  linkCard: null,
  interactionSummary: null,
};

const publishedPage: ContentCenterPublishedPageView = {
  list: [thinRepostCard],
  nextCursor: null,
  degraded: false,
  degradedReasons: [],
  pageMayBeShort: false,
  filteredCountHint: 0,
};

describe('content center published card hydration', () => {
  it('shows the repost source while preserving the repost actor and record id', async () => {
    server.use(
      http.get('/api/posts/:postId', ({ params }) => {
        const postId = String(params.postId);
        return apiSuccessResponse(
          postId === 'repost-1'
            ? postDetailFixture({
                postId,
                authorHandle: 'reposter',
                postKind: 'REPOST',
                bodyText: null,
                repostOfPostId: 'source-1',
              })
            : postDetailFixture({
                postId: 'source-1',
                authorHandle: 'source_author',
                bodyText: '这是被转发的原帖正文',
              }),
        );
      }),
    );

    const result = await hydrateContentCenterPublishedPage(publishedPage);

    expect(result.list[0]).toMatchObject({
      id: 'repost-1',
      contentPostId: 'source-1',
      content: '这是被转发的原帖正文',
      author: { handle: 'source_author' },
      variant: 'profile',
      relation: {
        kind: 'REPOST',
        actor: { handle: 'reposter', displayName: 'reposter' },
        targetPostId: 'source-1',
      },
    });
  });
});
