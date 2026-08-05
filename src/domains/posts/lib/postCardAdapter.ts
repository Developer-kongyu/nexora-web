import type {
  MediaItem,
  PostAttachedMediaView,
  PostCardBriefView,
  PostDetailDto,
  PostInteractionSummaryView,
  PostLinkCardView,
  PostViewModel,
} from '../model/types';
import type { UserIdentityBriefView } from '@/shared/model/userIdentity';

export type PostCardVariant = NonNullable<PostViewModel['variant']>;

function mapRelation(
  kind: PostCardBriefView['postKind'],
  actor: PostViewModel['author'],
  actorProfileAvailable: boolean,
  createdAt: string,
  targetPostId: string | null = null,
  rootPostId: string | null = null,
): PostViewModel['relation'] {
  if (kind !== 'REPLY' && kind !== 'REPOST') return undefined;
  return {
    kind,
    actor,
    actorProfileAvailable,
    targetPostId,
    rootPostId,
    createdAt,
  };
}

function fallbackAuthor(authorUserId: string): PostViewModel['author'] {
  return {
    id: authorUserId,
    handle: 'unavailable',
    displayName: '用户资料暂不可用',
    avatarUrl: null,
  };
}

function mapMedia(items: PostAttachedMediaView[]): MediaItem[] {
  return items.flatMap((media) => {
    const url = media.publicUrl ?? media.thumbnailUrl;
    if (!url || (media.mediaType !== 'IMAGE' && media.mediaType !== 'VIDEO')) return [];
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
          media.durationMs === null ? undefined : Math.max(0, Math.round(media.durationMs / 1000)),
      },
    ];
  });
}

function mapAuthor(authorUserId: string, author: UserIdentityBriefView | null) {
  return author
    ? {
        id: author.userId,
        handle: author.handle,
        displayName: author.displayName,
        avatarUrl: author.avatarUrl,
      }
    : fallbackAuthor(authorUserId);
}

function mapLinkCard(card: PostLinkCardView | null): PostViewModel['linkPreview'] {
  return card
    ? {
        url: card.url,
        title: card.title ?? card.siteName ?? card.url,
        description: card.description ?? '',
        imageUrl: card.previewImageUrl ?? undefined,
      }
    : undefined;
}

function mapStats(summary: PostInteractionSummaryView): PostViewModel['stats'] {
  return {
    comments: summary.commentCount,
    likes: summary.likeCount,
    reposts: summary.repostCount,
    bookmarks: summary.bookmarkCount,
    shares: 0,
    views: summary.impressionCount ?? 0,
  };
}

export function postCardBriefToViewModel(
  card: PostCardBriefView,
  variant: PostCardVariant = 'feed',
): PostViewModel {
  const summary = card.interactionSummary;
  const published = card.status === 'PUBLISHED';
  const authorProfileAvailable = card.author !== null;
  const author = mapAuthor(card.authorUserId, card.author);
  const createdAt = card.publishedAtIso ?? '1970-01-01T00:00:00.000Z';
  return {
    id: card.postId,
    contentPostId: card.postId,
    postKind: card.postKind,
    authorProfileAvailable,
    author,
    content: card.bodyTextPreview?.trim() || '该内容暂无文字摘要',
    createdAt,
    tags: [],
    media: mapMedia(card.attachedMedia),
    linkPreview: mapLinkCard(card.linkCard),
    community: card.community
      ? {
          id: card.community.communityId,
          name: card.community.displayName,
          slug: card.community.slug ?? card.community.communityId,
        }
      : undefined,
    stats: summary
      ? mapStats(summary)
      : { comments: 0, likes: 0, reposts: 0, bookmarks: 0, shares: 0, views: 0 },
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
    relation: mapRelation(card.postKind, author, authorProfileAvailable, createdAt),
    variant,
  };
}

/** 用原帖的展示数据替换薄转发壳，同时保留转发记录 ID 和转发者标签。 */
export function mergeRepostSource(repost: PostViewModel, source: PostViewModel): PostViewModel {
  const actor = repost.relation?.actor ?? repost.author;
  const actorProfileAvailable =
    repost.relation?.actorProfileAvailable ?? repost.authorProfileAvailable !== false;
  const contentPostId = source.contentPostId ?? source.id;
  return {
    ...source,
    id: repost.id,
    contentPostId,
    postKind: 'REPOST',
    relation: {
      kind: 'REPOST',
      actor,
      actorProfileAvailable,
      targetPostId: contentPostId,
      rootPostId: source.relation?.rootPostId ?? contentPostId,
      createdAt: repost.relation?.createdAt ?? repost.createdAt,
    },
    variant: repost.variant,
  };
}

/** 为回复补齐直接父级作者，供“回复了 @谁”和详情上下文展示使用。 */
export function mergeReplyTarget(reply: PostViewModel, target: PostViewModel): PostViewModel {
  if (reply.relation?.kind !== 'REPLY') return reply;
  return {
    ...reply,
    relation: {
      ...reply.relation,
      targetAuthor: target.author,
      targetProfileAvailable: target.authorProfileAvailable !== false,
    },
  };
}

export function postDetailToViewModel(detail: PostDetailDto | PostViewModel): PostViewModel {
  if ('id' in detail) return { ...detail, variant: 'detail' };
  const authorProfileAvailable = detail.author !== null;
  const author = mapAuthor(detail.authorUserId, detail.author);
  const createdAt = detail.publishedAtIso ?? '1970-01-01T00:00:00.000Z';
  return {
    id: detail.postId,
    contentPostId: detail.postId,
    postKind: detail.postKind,
    authorProfileAvailable,
    author,
    content: detail.bodyText?.trim() || '该帖子暂无文字内容',
    createdAt,
    tags: detail.hashtags.map((tag) => tag.tagNormalized),
    media: mapMedia(detail.attachedMedia),
    linkPreview: mapLinkCard(detail.linkCard),
    community: detail.community
      ? {
          id: detail.community.communityId,
          name: detail.community.displayName,
          slug: detail.community.slug ?? detail.community.communityId,
        }
      : undefined,
    stats: mapStats(detail.interactionSummary),
    permissions: {
      canComment: detail.interactionPermission.canComment,
      canLike: detail.interactionPermission.canLike,
      canRepost: detail.interactionPermission.canRepost,
      canQuote: detail.interactionPermission.canQuote,
    },
    viewer: {
      liked: detail.interactionSummary.viewerState?.liked ?? false,
      bookmarked: detail.interactionSummary.viewerState?.bookmarked ?? false,
      reposted: detail.interactionSummary.viewerState?.reposted ?? false,
    },
    relation: mapRelation(
      detail.postKind,
      author,
      authorProfileAvailable,
      createdAt,
      detail.postKind === 'REPOST' ? detail.repostOfPostId : detail.replyToPostId,
      detail.rootPostId,
    ),
    variant: 'detail',
  };
}
