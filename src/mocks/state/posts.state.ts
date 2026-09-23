import type {
  PostCardBriefView,
  PostDetailDto,
  PostDraftListItemView,
  PostDraftComposeView,
  PostDraftDetailView,
  PostComposeInput,
  ReplyPostListItemView,
  PostInteractionCountersPublicDto,
} from '@/domains/posts/model';
import { fixtureState } from './fixtures.state';
import type { FeedListItemDto } from '@/domains/feed/model';
import {
  toPostComposeInput,
  POST_VISIBILITIES,
  POST_GENERAL_PERMISSIONS,
  POST_SOURCE_PERMISSIONS,
  hasPostComposeContent,
} from '@/domains/posts/model';
import { MEDIA_POST_MAX_FILES } from '@/domains/media/model';
import { mediaState } from './media.state';
import { apiError, ok } from '../handlers/http';
import { requireArrayItem } from '@/shared/lib/array';

function createPostsState() {
  function mockPostCard(postId: string): PostCardBriefView | null {
    const post = fixtureState.posts.find((candidate) => candidate.id === postId);
    if (!post) return null;
    return {
      postId: post.id,
      authorUserId: post.author.id,
      postKind: 'ORIGINAL',
      bodyTextPreview: post.content.slice(0, 280),
      visibility: 'PUBLIC',
      status: 'PUBLISHED',
      publishedAtIso: post.createdAt,
      author: {
        userId: post.author.id,
        handle: post.author.handle,
        displayName: post.author.displayName,
        avatarUrl: post.author.avatarUrl,
      },
      community: post.community
        ? {
            communityId: post.community.id,
            slug: post.community.slug,
            displayName: post.community.name,
            avatarUrl: null,
          }
        : null,
      attachedMedia: post.media.map((media, index) => ({
        mediaAssetId: media.id,
        mediaType: media.kind === 'image' ? 'IMAGE' : 'VIDEO',
        sortOrder: index + 1,
        title: media.title || null,
        description: media.description || null,
        width: media.width ?? null,
        height: media.height ?? null,
        durationMs: media.durationSeconds ? media.durationSeconds * 1000 : null,
        publicUrl: media.url,
        thumbnailUrl: media.kind === 'video' ? (media.posterUrl ?? null) : media.url,
        renderStatus: 'READY',
      })),
      linkCard: post.linkPreview
        ? {
            url: post.linkPreview.url,
            title: post.linkPreview.title,
            description: post.linkPreview.description,
            siteName: null,
            previewImageUrl: post.linkPreview.imageUrl ?? null,
          }
        : null,
      interactionSummary: {
        likeCount: post.stats.likes,
        bookmarkCount: post.stats.bookmarks,
        commentCount: post.stats.comments,
        quoteCount: 0,
        repostCount: post.stats.reposts,
        viewerState: {
          liked: post.viewer.liked,
          reposted: post.viewer.reposted,
          bookmarked: post.viewer.bookmarked,
          bookmarkCollectionId: null,
        },
      },
    };
  }

  function mockFeedListItem(postId: string): FeedListItemDto {
    const post = fixtureState.posts.find((candidate) => candidate.id === postId);
    const card = mockPostCard(postId);
    if (!post || !card) throw new Error(`Missing mock feed fixture: ${postId}`);
    const interaction = card.interactionSummary;
    return {
      postId: card.postId,
      dedupePostId: card.postId,
      publishedAtIso: card.publishedAtIso ?? post.createdAt,
      author: {
        userId: card.authorUserId,
        displayName: card.author?.displayName ?? null,
        handle: card.author?.handle ?? null,
        avatarUrl: card.author?.avatarUrl ?? null,
      },
      community: card.community
        ? {
            communityId: card.community.communityId,
            name: card.community.displayName,
            slug: card.community.slug ?? card.community.communityId,
            avatarUrl: card.community.avatarUrl,
            description: null,
          }
        : null,
      summary: {
        bodyText: card.bodyTextPreview,
        hasImage: card.attachedMedia.some((media) => media.mediaType === 'IMAGE'),
        hasVideo: card.attachedMedia.some((media) => media.mediaType === 'VIDEO'),
        mediaCount: card.attachedMedia.length,
      },
      mediaBundle: card.attachedMedia.length
        ? {
            items: card.attachedMedia.map((media) => ({
              slotIndex: media.sortOrder,
              mediaAssetId: media.mediaAssetId,
              assetKind: media.mediaType === 'VIDEO' ? ('VIDEO' as const) : ('IMAGE' as const),
              previewUrl: media.publicUrl,
              posterUrl: media.thumbnailUrl,
              width: media.width,
              height: media.height,
              durationMs: media.durationMs,
            })),
            mediaCount: card.attachedMedia.length,
          }
        : null,
      counters: {
        likeCount: interaction?.likeCount ?? 0,
        commentCount: interaction?.commentCount ?? 0,
        quoteCount: interaction?.quoteCount ?? 0,
        repostCount: interaction?.repostCount ?? 0,
        bookmarkCount: interaction?.bookmarkCount ?? 0,
        impressionCount: post.stats.views,
        dedupedVideoViewCount: 0,
      },
      viewerState: interaction?.viewerState
        ? {
            liked: interaction.viewerState.liked,
            reposted: interaction.viewerState.reposted,
            quoted: false,
            bookmarked: interaction.viewerState.bookmarked,
          }
        : null,
    };
  }

  function mockPostDetail(postId: string): PostDetailDto | null {
    const post = fixtureState.posts.find((candidate) => candidate.id === postId);
    const card = mockPostCard(postId);
    if (!post || !card || !card.interactionSummary) return null;
    return {
      postId: card.postId,
      authorUserId: card.authorUserId,
      postKind: card.postKind,
      replyToPostId: post.relation?.kind === 'REPLY' ? post.relation.targetPostId : null,
      quoteOfPostId: null,
      repostOfPostId: post.relation?.kind === 'REPOST' ? post.relation.targetPostId : null,
      rootPostId: post.relation?.rootPostId ?? null,
      bodyText: post.content,
      status: card.status,
      author: card.author,
      community: card.community,
      attachedMedia: card.attachedMedia,
      hashtags: post.tags.map((tagNormalized) => ({ tagNormalized })),
      linkCard: card.linkCard,
      interactionSummary: card.interactionSummary,
      interactionPermission: {
        canView: true,
        canLike: true,
        canBookmark: true,
        canComment: true,
        canQuote: true,
        canRepost: true,
      },
      publishedAtIso: card.publishedAtIso,
    };
  }

  function requiredMockPostCard(postId: string): PostCardBriefView {
    const card = mockPostCard(postId);
    if (!card) throw new Error(`Missing mock post fixture: ${postId}`);
    return card;
  }

  let mockContentCenterDrafts = fixtureState.contentCenterDrafts.map((draft) => ({
    ...draft,
    linkPreviewState: {
      ...draft.linkPreviewState,
      card: draft.linkPreviewState.card ? { ...draft.linkPreviewState.card } : null,
    },
  }));

  function createMockDraftCompose(item: PostDraftListItemView): PostDraftComposeView {
    const mediaItems = Array.from({ length: item.mediaCountProjection }, (_, sortOrder) => ({
      mediaAssetId: `draft-media-${item.draftId}-${sortOrder + 1}`,
      title: null,
      description: null,
      sortOrder,
    }));
    return {
      bodyText: item.bodyTextPreview,
      bodyTextNormalized: item.bodyTextPreview,
      mediaItems,
      entityRanges: [],
      linkUrl: item.linkPreviewState.card?.url ?? null,
      linkCardDisabled: item.linkPreviewState.state === 'DISABLED',
      visibility: null,
      likePermission: null,
      bookmarkPermission: null,
      commentPermission: null,
      quotePermission: null,
      repostPermission: null,
      communityId: null,
      placeId: null,
      placeName: null,
      replyToPostId: null,
      quoteOfPostId: null,
      repostOfPostId: null,
      composerMeta: {
        editorKind: 'TEXTAREA',
        textIndexUnit: 'UTF16_CODE_UNIT',
        normalizationVersion: 'POST_TEXT_NORMALIZATION_V1',
      },
    };
  }

  const mockDraftDetails = new Map<string, PostDraftDetailView>(
    mockContentCenterDrafts.map((item) => [
      item.draftId,
      {
        draftId: item.draftId,
        draftVersion: item.draftVersion,
        state: item.state,
        composeSnapshot: createMockDraftCompose(item),
        validationDiagnostics: null,
        linkPreviewState: item.linkPreviewState,
        updatedAtIso: item.updatedAtIso,
        lastAutosavedAtIso: null,
        lastSavedAtIso: item.updatedAtIso,
      },
    ]),
  );

  function draftComposeSnapshot(input: PostComposeInput): PostDraftComposeView {
    const compose = toPostComposeInput(input);
    return {
      ...compose,
      bodyTextNormalized: compose.bodyText,
    };
  }

  function isNullableString(value: unknown): value is string | null {
    return value === null || typeof value === 'string';
  }

  function isNullableEnum<T extends string>(
    value: unknown,
    allowedValues: readonly T[],
  ): value is T | null {
    return value === null || (typeof value === 'string' && allowedValues.includes(value as T));
  }

  function isMockPostComposeInput(value: unknown): value is PostComposeInput {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const input = value as Partial<PostComposeInput>;
    const mediaItemsValid =
      Array.isArray(input.mediaItems) &&
      input.mediaItems.length <= MEDIA_POST_MAX_FILES &&
      input.mediaItems.every(
        (item, index) =>
          Boolean(item && typeof item === 'object') &&
          typeof item.mediaAssetId === 'string' &&
          item.mediaAssetId.length > 0 &&
          isNullableString(item.title) &&
          isNullableString(item.description) &&
          Number.isInteger(item.sortOrder) &&
          item.sortOrder === index,
      );
    const entityRangesValid =
      Array.isArray(input.entityRanges) &&
      input.entityRanges.every((item) => {
        if (!item || typeof item !== 'object') return false;
        if (
          !Number.isInteger(item.startOffset) ||
          !Number.isInteger(item.endOffset) ||
          item.startOffset < 0 ||
          item.endOffset <= item.startOffset
        ) {
          return false;
        }
        if (item.entityType === 'MENTION') {
          return (
            isNullableString(item.mentionedUserId) &&
            typeof item.handleSnapshot === 'string' &&
            typeof item.displayText === 'string'
          );
        }
        return item.entityType === 'HASHTAG' && typeof item.tagTextSnapshot === 'string';
      });
    const composerMeta = input.composerMeta;

    return (
      isNullableString(input.bodyText) &&
      mediaItemsValid &&
      entityRangesValid &&
      isNullableString(input.linkUrl) &&
      typeof input.linkCardDisabled === 'boolean' &&
      isNullableEnum(input.visibility, POST_VISIBILITIES) &&
      isNullableEnum(input.likePermission, POST_GENERAL_PERMISSIONS) &&
      isNullableEnum(input.bookmarkPermission, POST_GENERAL_PERMISSIONS) &&
      isNullableEnum(input.commentPermission, POST_GENERAL_PERMISSIONS) &&
      isNullableEnum(input.quotePermission, POST_SOURCE_PERMISSIONS) &&
      isNullableEnum(input.repostPermission, POST_SOURCE_PERMISSIONS) &&
      isNullableString(input.communityId) &&
      isNullableString(input.placeId) &&
      isNullableString(input.placeName) &&
      isNullableString(input.replyToPostId) &&
      isNullableString(input.quoteOfPostId) &&
      isNullableString(input.repostOfPostId) &&
      Boolean(
        composerMeta &&
        composerMeta.editorKind === 'TEXTAREA' &&
        composerMeta.textIndexUnit === 'UTF16_CODE_UNIT' &&
        composerMeta.normalizationVersion === 'POST_TEXT_NORMALIZATION_V1',
      )
    );
  }

  function mockDraftLinkPreviewState(input: PostComposeInput) {
    if (input.linkCardDisabled) return { state: 'DISABLED' as const, card: null };
    if (input.linkUrl) return { state: 'PENDING' as const, card: null };
    return { state: 'NONE' as const, card: null };
  }

  function syncMockDraftList(detail: PostDraftDetailView): void {
    let imageCountProjection = 0;
    let videoCountProjection = 0;
    detail.composeSnapshot.mediaItems.forEach((item) => {
      const kind = mediaState.mockMediaAssetsById.get(item.mediaAssetId)?.assetKind ?? 'IMAGE';
      if (kind === 'VIDEO') videoCountProjection += 1;
      else imageCountProjection += 1;
    });
    const nextItem: PostDraftListItemView = {
      draftId: detail.draftId,
      draftVersion: detail.draftVersion,
      state: detail.state,
      bodyTextPreview: detail.composeSnapshot.bodyText?.slice(0, 160) ?? null,
      mediaCountProjection: detail.composeSnapshot.mediaItems.length,
      imageCountProjection,
      videoCountProjection,
      linkPreviewState: detail.linkPreviewState,
      updatedAtIso: detail.updatedAtIso,
    };
    const currentIndex = mockContentCenterDrafts.findIndex(
      (item) => item.draftId === detail.draftId,
    );
    if (currentIndex === -1) mockContentCenterDrafts.unshift(nextItem);
    else mockContentCenterDrafts[currentIndex] = nextItem;
  }

  function removeMockDraft(draftId: string): boolean {
    const existed = mockDraftDetails.delete(draftId);
    mockContentCenterDrafts = mockContentCenterDrafts.filter((item) => item.draftId !== draftId);
    return existed;
  }

  async function updateMockDraft(draftId: string, request: Request, mode: 'AUTOSAVE' | 'SAVE') {
    const current = mockDraftDetails.get(draftId);
    if (!current) return apiError(404, 'POST_DRAFT_NOT_FOUND', '草稿不存在');
    const requestedVersion = Number(request.headers.get('x-post-draft-version'));
    if (!Number.isInteger(requestedVersion) || requestedVersion < 1) {
      return apiError(400, 'POST_DRAFT_VERSION_REQUIRED', '缺少有效草稿版本');
    }
    if (requestedVersion !== current.draftVersion) {
      return apiError(409, 'POST_DRAFT_VERSION_CONFLICT', '草稿版本已更新');
    }

    const rawInput = await request.json();
    if (!isMockPostComposeInput(rawInput) || !hasPostComposeContent(rawInput)) {
      return apiError(400, 'POST_DRAFT_INPUT_INVALID', '草稿正文、媒体或链接至少需要一项');
    }
    const unchanged =
      JSON.stringify(toPostComposeInput(current.composeSnapshot)) ===
      JSON.stringify(toPostComposeInput(rawInput));
    if (unchanged) {
      return ok({
        draftId,
        draftVersion: current.draftVersion,
        saved: false,
        reason: 'NO_CHANGE' as const,
        updatedAtIso: current.updatedAtIso,
        lastSavedAtIso: current.lastSavedAtIso,
      });
    }

    const updatedAtIso = new Date().toISOString();
    const next: PostDraftDetailView = {
      ...current,
      draftVersion: current.draftVersion + 1,
      state: 'EDITABLE',
      composeSnapshot: draftComposeSnapshot(rawInput),
      linkPreviewState: mockDraftLinkPreviewState(rawInput),
      updatedAtIso,
      lastAutosavedAtIso: mode === 'AUTOSAVE' ? updatedAtIso : current.lastAutosavedAtIso,
      lastSavedAtIso: mode === 'SAVE' ? updatedAtIso : current.lastSavedAtIso,
    };
    mockDraftDetails.set(draftId, next);
    syncMockDraftList(next);
    return ok({
      draftId,
      draftVersion: next.draftVersion,
      saved: true,
      reason: 'UPDATED' as const,
      updatedAtIso,
      lastSavedAtIso: next.lastSavedAtIso,
    });
  }

  function pendingMockMediaAssetIds(input: PostComposeInput): string[] {
    return input.mediaItems.flatMap((item) => {
      const asset = mediaState.mockMediaAssetsById.get(item.mediaAssetId);
      return asset?.status === 'READY' ? [] : [item.mediaAssetId];
    });
  }

  const mockDeletedContent = fixtureState.deletedContent.map((item) => ({ ...item }));

  const mockReplyAuthor = (userId: string) => {
    const user = fixtureState.users.find((candidate) => candidate.id === userId);
    return user
      ? {
          userId: user.id,
          handle: user.handle,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        }
      : null;
  };

  function mockReplyItem(input: {
    commentId: string;
    commentPostId: string;
    authorUserId: string;
    bodyText: string;
    parentCommentId: string | null;
    topLevelCommentId: string | null;
    depth: number;
    createdAtIso: string;
    likeCount?: number;
    commentCount?: number;
  }): ReplyPostListItemView {
    return {
      relation: {
        commentId: input.commentId,
        authorUserId: input.authorUserId,
        parentCommentId: input.parentCommentId,
        topLevelCommentId: input.topLevelCommentId,
        depth: input.depth,
        status: 'ACTIVE',
        createdAtIso: input.createdAtIso,
        activatedAtIso: input.createdAtIso,
      },
      postCard: {
        postId: input.commentPostId,
        authorUserId: input.authorUserId,
        postKind: 'REPLY',
        bodyTextPreview: input.bodyText,
        visibility: 'PUBLIC',
        status: 'PUBLISHED',
        publishedAtIso: input.createdAtIso,
        author: mockReplyAuthor(input.authorUserId),
        community: null,
        attachedMedia: [],
        linkCard: null,
        interactionSummary: {
          likeCount: input.likeCount ?? 0,
          bookmarkCount: 0,
          commentCount: input.commentCount ?? 0,
          quoteCount: 0,
          repostCount: 0,
          viewerState: {
            liked: false,
            reposted: false,
            bookmarked: false,
            bookmarkCollectionId: null,
          },
        },
      },
      tombstone: null,
    };
  }

  const mockRepliesByPostId: Record<string, ReplyPostListItemView[]> = {
    'post-1': [
      mockReplyItem({
        commentId: 'comment-1',
        commentPostId: 'comment-post-1',
        authorUserId: 'u-travel',
        bodyText: '这组对比很直观，暖色方案更有周末的松弛感。期待看到完整参数。',
        parentCommentId: null,
        topLevelCommentId: null,
        depth: 0,
        createdAtIso: '2026-07-28T08:12:00.000Z',
        likeCount: 12,
        commentCount: 1,
      }),
      mockReplyItem({
        commentId: 'comment-2',
        commentPostId: 'comment-post-2',
        authorUserId: 'u-dev',
        bodyText: '收藏了。构图和色温的变化都很清晰，周末也想试试这个步骤。',
        parentCommentId: null,
        topLevelCommentId: null,
        depth: 0,
        createdAtIso: '2026-07-28T07:48:00.000Z',
        likeCount: 8,
      }),
      {
        relation: {
          commentId: 'comment-deleted',
          authorUserId: 'u-pm',
          parentCommentId: null,
          topLevelCommentId: null,
          depth: 0,
          status: 'DELETED',
          createdAtIso: '2026-07-28T06:50:00.000Z',
          activatedAtIso: '2026-07-28T06:50:00.000Z',
        },
        postCard: null,
        tombstone: { state: 'DELETED' },
      },
    ],
  };

  const mockCommentRootPostIds = new Map<string, string>([
    ['comment-1', 'post-1'],
    ['comment-2', 'post-1'],
    ['comment-deleted', 'post-1'],
  ]);

  function findMockComment(commentId: string) {
    for (const [listPostId, list] of Object.entries(mockRepliesByPostId)) {
      const index = list.findIndex((item) => item.relation.commentId === commentId);
      if (index >= 0) {
        return {
          listPostId,
          list,
          index,
          item: requireArrayItem(list, index, 'mock comment'),
        };
      }
    }
    return null;
  }

  function incrementMockChildCount(commentId: string, difference: number) {
    const found = findMockComment(commentId);
    const summary = found?.item.postCard?.interactionSummary;
    if (!summary) return;
    summary.commentCount = Math.max(0, summary.commentCount + difference);
  }

  function mockPostCounters(rootPostId: string): PostInteractionCountersPublicDto {
    const rootPost = fixtureState.posts.find((post) => post.id === rootPostId);
    return {
      likeCount: rootPost?.stats.likes ?? 0,
      commentCount: rootPost?.stats.comments ?? 0,
      quoteCount: 0,
      repostCount: rootPost?.stats.reposts ?? 0,
      bookmarkCount: rootPost?.stats.bookmarks ?? 0,
      impressionCount: rootPost?.stats.views ?? 0,
      dedupedVideoViewCount: 0,
    };
  }

  function updateMockPostInteraction(
    postId: string,
    action: 'like' | 'bookmark' | 'repost',
    active: boolean,
    adjustCounter = true,
  ): void {
    const fields = {
      like: { active: 'liked', count: 'likes', summaryCount: 'likeCount' },
      bookmark: { active: 'bookmarked', count: 'bookmarks', summaryCount: 'bookmarkCount' },
      repost: { active: 'reposted', count: 'reposts', summaryCount: 'repostCount' },
    } as const;
    const field = fields[action];
    const post = fixtureState.posts.find((item) => item.id === postId);
    if (post) {
      if (post.viewer[field.active] === active) return;
      // Seed fixtures share viewer objects, so replace the changed post's snapshot.
      post.viewer = { ...post.viewer, [field.active]: active };
      if (adjustCounter) {
        post.stats[field.count] = Math.max(0, post.stats[field.count] + (active ? 1 : -1));
      }
      return;
    }
    for (const replies of Object.values(mockRepliesByPostId)) {
      const summary = replies.find((item) => item.postCard?.postId === postId)?.postCard
        ?.interactionSummary;
      const viewer = summary?.viewerState;
      if (!summary || !viewer || viewer[field.active] === active) continue;
      summary.viewerState = { ...viewer, [field.active]: active };
      if (adjustCounter) {
        summary[field.summaryCount] = Math.max(0, summary[field.summaryCount] + (active ? 1 : -1));
      }
      return;
    }
  }

  function updateMockRootCommentCount(rootPostId: string, difference: number) {
    const rootPost = fixtureState.posts.find((post) => post.id === rootPostId);
    if (!rootPost) return;
    rootPost.stats.comments = Math.max(0, rootPost.stats.comments + difference);
  }
  return {
    mockPostCard,
    mockFeedListItem,
    mockPostDetail,
    requiredMockPostCard,
    get mockContentCenterDrafts() {
      return mockContentCenterDrafts;
    },
    set mockContentCenterDrafts(value: typeof mockContentCenterDrafts) {
      mockContentCenterDrafts = value;
    },
    createMockDraftCompose,
    mockDraftDetails,
    draftComposeSnapshot,
    isNullableString,
    isNullableEnum,
    isMockPostComposeInput,
    mockDraftLinkPreviewState,
    syncMockDraftList,
    removeMockDraft,
    updateMockDraft,
    pendingMockMediaAssetIds,
    mockDeletedContent,
    mockReplyAuthor,
    mockReplyItem,
    mockRepliesByPostId,
    mockCommentRootPostIds,
    findMockComment,
    incrementMockChildCount,
    mockPostCounters,
    updateMockRootCommentCount,
    updateMockPostInteraction,
  };
}

export let postsState = createPostsState();

export function resetPostsState(): void {
  postsState = createPostsState();
}
