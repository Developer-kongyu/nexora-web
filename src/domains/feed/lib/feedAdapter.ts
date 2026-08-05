import type { MediaItem, PostViewModel } from '@/domains/posts/model/types';
import type { FeedListItemDto, FeedPage, FeedResponseDto } from '../model/types';

function mapMedia(item: FeedListItemDto): MediaItem[] {
  return (
    item.mediaBundle?.items.flatMap((media) => {
      const url = media.previewUrl ?? media.posterUrl;
      if (!url) return [];
      return [
        {
          id: media.mediaAssetId,
          kind: media.assetKind === 'VIDEO' ? ('video' as const) : ('image' as const),
          url,
          posterUrl: media.posterUrl ?? undefined,
          alt: '帖子媒体',
          title: '',
          description: '',
          width: media.width ?? undefined,
          height: media.height ?? undefined,
          durationSeconds:
            media.durationMs === null ? undefined : Math.round(media.durationMs / 1000),
        },
      ];
    }) ?? []
  );
}

export function feedListItemToViewModel(item: FeedListItemDto): PostViewModel {
  return {
    id: item.postId,
    contentPostId:
      item.postId !== item.dedupePostId ? item.dedupePostId : item.postId,
    postKind: item.postId !== item.dedupePostId ? 'REPOST' : undefined,
    relation:
      item.postId !== item.dedupePostId
        ? {
            kind: 'REPOST',
            actor: {
              id: item.author.userId,
              handle: item.author.handle ?? 'unavailable',
              displayName:
                item.author.displayName ?? '\u7528\u6237\u8d44\u6599\u6682\u4e0d\u53ef\u7528',
              avatarUrl: item.author.avatarUrl,
            },
            actorProfileAvailable: Boolean(item.author.handle),
            targetPostId: item.dedupePostId,
            rootPostId: item.dedupePostId,
            createdAt: item.publishedAtIso,
          }
        : undefined,
    author: {
      id: item.author.userId,
      handle: item.author.handle ?? 'unavailable',
      displayName: item.author.displayName ?? '用户资料暂不可用',
      avatarUrl: item.author.avatarUrl,
    },
    authorProfileAvailable: Boolean(item.author.handle),
    content: item.summary.bodyText?.trim() || '该帖子暂无文字内容',
    createdAt: item.publishedAtIso,
    tags: [],
    media: mapMedia(item),
    community: item.community
      ? { id: item.community.communityId, name: item.community.name, slug: item.community.slug }
      : undefined,
    stats: {
      comments: item.counters.commentCount,
      likes: item.counters.likeCount,
      reposts: item.counters.repostCount,
      bookmarks: item.counters.bookmarkCount,
      shares: 0,
      views: item.counters.impressionCount,
    },
    permissions: { canComment: true, canLike: true, canRepost: true, canQuote: true },
    viewer: {
      liked: item.viewerState?.liked ?? false,
      bookmarked: item.viewerState?.bookmarked ?? false,
      reposted: item.viewerState?.reposted ?? false,
    },
    variant: 'feed',
  };
}

export function feedResponseToPage(response: FeedResponseDto | FeedPage): FeedPage {
  return {
    list: response.list.map((item) => ('postId' in item ? feedListItemToViewModel(item) : item)),
    nextCursor: response.nextCursor,
    hasMore: response.hasMore,
  };
}
