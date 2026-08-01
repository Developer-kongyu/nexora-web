import type { MediaItem, PostCardBriefView, PostViewModel } from '../model/types';

export type PostCardVariant = NonNullable<PostViewModel['variant']>;

function fallbackAuthor(authorUserId: string): PostViewModel['author'] {
  return {
    id: authorUserId,
    handle: 'unavailable',
    displayName: '用户资料暂不可用',
    avatarUrl: null,
  };
}

function mapMedia(card: PostCardBriefView): MediaItem[] {
  return card.attachedMedia.flatMap((media) => {
    const url = media.publicUrl ?? media.thumbnailUrl;
    if (!url) return [];

    return [
      {
        id: media.mediaAssetId,
        kind: media.mediaType === 'VIDEO' ? ('video' as const) : ('image' as const),
        url,
        posterUrl: media.thumbnailUrl ?? undefined,
        alt: media.description ?? media.title ?? '帖子媒体',
        title: media.title ?? '',
        description: media.description ?? '',
        width: media.width ?? undefined,
        height: media.height ?? undefined,
        durationSeconds:
          media.durationMs === null ? undefined : Math.max(0, Math.round(media.durationMs / 1_000)),
      },
    ];
  });
}

/**
 * Transitional adapter for the existing visual PostCard. The server contract
 * remains PostCardBriefView; this function only derives presentation defaults
 * and never fabricates identifiers or mutation state.
 */
export function postCardBriefToViewModel(
  card: PostCardBriefView,
  variant: PostCardVariant = 'feed',
): PostViewModel {
  const summary = card.interactionSummary;
  const published = card.status === 'PUBLISHED';

  return {
    id: card.postId,
    authorProfileAvailable: card.author !== null,
    author: card.author
      ? {
          id: card.author.userId,
          handle: card.author.handle,
          displayName: card.author.displayName,
          avatarUrl: card.author.avatarUrl,
        }
      : fallbackAuthor(card.authorUserId),
    content: card.bodyTextPreview?.trim() || '该内容暂无文字摘要',
    createdAt: card.publishedAtIso ?? '1970-01-01T00:00:00.000Z',
    tags: [],
    media: mapMedia(card),
    linkPreview: card.linkCard
      ? {
          url: card.linkCard.url,
          title: card.linkCard.title ?? card.linkCard.siteName ?? card.linkCard.url,
          description: card.linkCard.description ?? '',
          imageUrl: card.linkCard.previewImageUrl ?? undefined,
        }
      : undefined,
    community: card.community
      ? {
          id: card.community.communityId,
          name: card.community.displayName,
          slug: card.community.slug ?? card.community.communityId,
        }
      : undefined,
    stats: {
      comments: summary?.commentCount ?? 0,
      likes: summary?.likeCount ?? 0,
      reposts: summary?.repostCount ?? 0,
      bookmarks: summary?.bookmarkCount ?? 0,
      shares: 0,
      views: 0,
    },
    permissions: {
      canComment: published,
      canLike: published,
      canRepost: published,
      canQuote: published,
    },
    viewer: {
      liked: summary?.viewerState?.liked ?? false,
      bookmarked: summary?.viewerState?.bookmarked ?? false,
      reposted: summary?.viewerState?.reposted ?? false,
    },
    variant,
  };
}
