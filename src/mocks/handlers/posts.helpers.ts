import type { PostComposeInput, PublishPostDirectInput } from '@/domains/posts/model';
import { fixtureState } from '../state/fixtures.state';
import { communitiesState } from '../state/communities.state';
import { mediaState } from '../state/media.state';
import { postsState } from '../state/posts.state';

export function addMockPublishedPost(postId: string, input: PostComposeInput): void {
  if (fixtureState.posts.some((post) => post.id === postId)) return;
  const community = input.communityId
    ? communitiesState.allCommunitySummaries().find((item) => item.id === input.communityId)
    : null;
  fixtureState.posts.unshift({
    id: postId,
    author: fixtureState.currentUser,
    authorProfileAvailable: true,
    content: input.bodyText ?? '',
    createdAt: new Date().toISOString(),
    tags: input.entityRanges.flatMap((item) =>
      item.entityType === 'HASHTAG' ? [item.tagTextSnapshot] : [],
    ),
    media: input.mediaItems.map((item) => {
      const asset = mediaState.mockMediaAssetsById.get(item.mediaAssetId);
      const video = asset?.assetKind === 'VIDEO';
      return {
        id: item.mediaAssetId,
        kind: video ? ('video' as const) : ('image' as const),
        url: video ? '/media/video-poster.svg' : '/media/coast.svg',
        posterUrl: video ? '/media/video-poster.svg' : undefined,
        alt: asset?.fileName ?? item.title ?? '帖子媒体',
        title: item.title ?? asset?.fileName ?? '帖子媒体',
        description: item.description ?? '',
      };
    }),
    community: community
      ? { id: community.id, name: community.name, slug: community.slug }
      : undefined,
    stats: {
      comments: 0,
      likes: 0,
      reposts: 0,
      bookmarks: 0,
      shares: 0,
      views: 0,
    },
    permissions: {
      canComment: input.commentPermission !== 'NO_ONE',
      canLike: input.likePermission !== 'NO_ONE',
      canRepost: input.repostPermission !== 'NO_ONE',
      canQuote: input.quotePermission !== 'NO_ONE',
    },
    viewer: { liked: false, bookmarked: false, reposted: false },
    variant: 'profile',
  });
}

export function publishMockCompose(postId: string, input: PublishPostDirectInput) {
  const pendingMediaAssetIds = postsState.pendingMockMediaAssetIds(input);
  if (!pendingMediaAssetIds.length) addMockPublishedPost(postId, input);
  return {
    postId,
    publishState: pendingMediaAssetIds.length ? ('PUBLISHING' as const) : ('PUBLISHED' as const),
    publishMode: pendingMediaAssetIds.length
      ? ('WAIT_MEDIA_READY' as const)
      : ('IMMEDIATE' as const),
    pendingMediaAssetIds,
  };
}
