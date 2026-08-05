import type { UserSummary } from '@/domains/users/model/types';
import type { ResolvedMediaState } from '@/shared/model/media';
import type { UserIdentityBriefView } from '@/shared/model/userIdentity';

export type PostKind = 'ORIGINAL' | 'REPLY' | 'QUOTE' | 'REPOST';
export type PostPublishState = 'PUBLISHED' | 'PUBLISHING';
export type PostPublishMode = 'IMMEDIATE' | 'WAIT_MEDIA_READY';
export type PostDeleteOutcome = 'DELETED_NOW' | 'ALREADY_DELETED';

export const POST_READ_STATUSES = ['PUBLISHING', 'PUBLISHED', 'PUBLISH_FAILED', 'DELETED'] as const;
export type PostReadStatus = (typeof POST_READ_STATUSES)[number];

export const POST_VISIBILITIES = ['PUBLIC', 'UNLISTED', 'FOLLOWERS', 'PRIVATE'] as const;
export type PostVisibility = (typeof POST_VISIBILITIES)[number];

export const POST_GENERAL_PERMISSIONS = ['EVERYONE', 'FOLLOWING', 'MUTUALS', 'NO_ONE'] as const;
export type PostGeneralPermission = (typeof POST_GENERAL_PERMISSIONS)[number];

export const POST_SOURCE_PERMISSIONS = ['EVERYONE', 'FOLLOWING', 'NO_ONE'] as const;
export type PostSourcePermission = (typeof POST_SOURCE_PERMISSIONS)[number];

export interface PostComposerMetaSnapshot {
  editorKind: 'TEXTAREA';
  textIndexUnit: 'UTF16_CODE_UNIT';
  normalizationVersion: 'POST_TEXT_NORMALIZATION_V1';
}

export interface PostComposeMediaItemInput {
  mediaAssetId: string;
  title: string | null;
  description: string | null;
  sortOrder: number;
}

export type PostDraftMediaItemSnapshot = PostComposeMediaItemInput;

export interface PostComposeMentionRangeInput {
  entityType: 'MENTION';
  mentionedUserId: string | null;
  handleSnapshot: string;
  displayText: string;
  startOffset: number;
  endOffset: number;
}

export interface PostComposeHashtagRangeInput {
  entityType: 'HASHTAG';
  tagTextSnapshot: string;
  startOffset: number;
  endOffset: number;
}

export type PostComposeEntityRangeInput =
  PostComposeMentionRangeInput | PostComposeHashtagRangeInput;

export interface PostComposeInput {
  bodyText: string | null;
  mediaItems: PostComposeMediaItemInput[];
  entityRanges: PostComposeEntityRangeInput[];
  linkUrl: string | null;
  linkCardDisabled: boolean;
  visibility: PostVisibility | null;
  likePermission: PostGeneralPermission | null;
  bookmarkPermission: PostGeneralPermission | null;
  commentPermission: PostGeneralPermission | null;
  quotePermission: PostSourcePermission | null;
  repostPermission: PostSourcePermission | null;
  communityId: string | null;
  placeId: string | null;
  placeName: string | null;
  replyToPostId: string | null;
  quoteOfPostId: string | null;
  repostOfPostId: string | null;
  composerMeta: PostComposerMetaSnapshot;
}

export interface PublishPostDirectInput extends PostComposeInput {
  allowWaitingMediaPublish: boolean;
}

export interface PublishPostDirectResult extends PostPublishStatusView {
  postId: string;
}

export interface CreatePostDraftResult {
  draftId: string;
  draftVersion: number;
  saved: true;
  created: true;
  bodyTextPreview: string | null;
  updatedAtIso: string;
}

export interface SavePostDraftResult {
  draftId: string;
  draftVersion: number;
  saved: boolean;
  reason: 'UPDATED' | 'NO_CHANGE';
  updatedAtIso: string;
  lastSavedAtIso?: string | null;
}

export interface PostPublishStatusView {
  publishState: PostPublishState;
  publishMode: PostPublishMode;
  pendingMediaAssetIds: string[];
}

export type MediaKind = 'image' | 'video';
export interface MediaItem {
  id: string;
  kind: MediaKind;
  url: string;
  posterUrl?: string;
  alt: string;
  title: string;
  description: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export interface PostStats {
  comments: number;
  likes: number;
  reposts: number;
  bookmarks: number;
  shares: number;
  views: number;
}

export interface PostPermissions {
  canComment: boolean;
  canLike: boolean;
  canRepost: boolean;
  canQuote: boolean;
}

export interface PostViewModel {
  id: string;
  contentPostId?: string;
  postKind?: PostKind;
  author: UserSummary;
  authorProfileAvailable?: boolean;
  content: string;
  createdAt: string;
  tags: string[];
  media: MediaItem[];
  linkPreview?: { title: string; description: string; url: string; imageUrl?: string };
  community?: { id: string; name: string; slug: string };
  stats: PostStats;
  permissions: PostPermissions;
  viewer: { liked: boolean; bookmarked: boolean; reposted: boolean };
  relation?: {
    kind: 'REPLY' | 'REPOST';
    actor: UserSummary;
    actorProfileAvailable: boolean;
    targetAuthor?: UserSummary;
    targetProfileAvailable?: boolean;
    targetPostId: string | null;
    rootPostId: string | null;
    createdAt: string;
  };
  variant?: 'feed' | 'detail' | 'search' | 'profile' | 'bookmark' | 'community' | 'announcement';
}

export type LinkPreviewComposeStatus =
  'NONE' | 'DISABLED' | 'MISSING' | 'PENDING' | 'READY' | 'FAILED' | 'STALE';

export interface PostDraftLinkPreviewStateView {
  state: LinkPreviewComposeStatus | 'UNAVAILABLE';
  card: PostLinkCardView | null;
}

export interface PostDraftListItemView {
  draftId: string;
  draftVersion: number;
  state: 'EDITABLE' | 'PUBLISH_FAILED_EDITABLE';
  bodyTextPreview: string | null;
  mediaCountProjection: number;
  imageCountProjection: number;
  videoCountProjection: number;
  linkPreviewState: PostDraftLinkPreviewStateView;
  updatedAtIso: string;
}

export interface PostDraftComposeView extends PostComposeInput {
  bodyTextNormalized: string | null;
  mediaItems: PostDraftMediaItemSnapshot[];
}

export interface PostDraftDetailView {
  draftId: string;
  draftVersion: number;
  state: 'EDITABLE' | 'PUBLISH_FAILED_EDITABLE';
  composeSnapshot: PostDraftComposeView;
  validationDiagnostics: unknown;
  linkPreviewState: PostDraftLinkPreviewStateView;
  updatedAtIso: string;
  lastAutosavedAtIso: string | null;
  lastSavedAtIso: string | null;
}

export interface PostDeletedListItemView {
  postId: string;
  postKind: PostKind;
  bodyTextPreview: string | null;
  deletedAtIso: string;
}

export interface DeletePostDraftOutcomeView {
  draftId: string;
  outcome: PostDeleteOutcome;
}

export interface PublishPostFromDraftInput {
  allowWaitingMediaPublish: boolean;
}

export interface PublishPostFromDraftResult extends PostPublishStatusView {
  postId: string;
  draftId: string;
}

export interface CreateTextEngagementInput {
  bodyText: string;
  mediaItems: [];
  entityRanges: [];
  linkUrl: null;
  linkCardDisabled: boolean;
  composerMeta: PostComposerMetaSnapshot;
}

export interface PostInteractionCountersPublicDto {
  likeCount: number;
  commentCount: number;
  quoteCount: number;
  repostCount: number;
  bookmarkCount: number;
  impressionCount: number;
  dedupedVideoViewCount: number;
}

export type DerivedPostPublishPublicDto = PostPublishStatusView;

export interface CommentRelationPublicDto {
  commentId: string;
  commentPostId: string;
  rootPostId: string;
  parentCommentId: string | null;
  topLevelCommentId: string | null;
  authorUserId: string;
  depth: number;
  status: 'PUBLISHING' | 'ACTIVE' | 'PUBLISH_FAILED' | 'DELETED' | 'HIDDEN';
  directReplyCount: number;
  descendantReplyCount: number;
  createdAtIso: string;
  activatedAtIso: string | null;
  publishFailedAtIso: string | null;
  deletedAtIso: string | null;
}

export interface PostCommunityBriefView {
  communityId: string;
  slug: string | null;
  displayName: string;
  avatarUrl: string | null;
}

export interface PostAttachedMediaView {
  mediaAssetId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'UNKNOWN';
  sortOrder: number;
  title: string | null;
  description: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  publicUrl: string | null;
  thumbnailUrl: string | null;
  renderStatus: ResolvedMediaState;
}

export interface PostLinkCardView {
  url: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  previewImageUrl: string | null;
}

export interface PostInteractionSummaryView {
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
  quoteCount: number;
  repostCount: number;
  impressionCount?: number;
  dedupedVideoViewCount?: number;
  viewerState: {
    liked: boolean;
    reposted: boolean;
    bookmarked: boolean;
    bookmarkCollectionId: string | null;
  } | null;
}

export interface PostCardBriefView {
  postId: string;
  authorUserId: string;
  postKind: PostKind;
  bodyTextPreview: string | null;
  visibility: PostVisibility;
  status: PostReadStatus;
  publishedAtIso: string | null;
  author: UserIdentityBriefView | null;
  community: PostCommunityBriefView | null;
  attachedMedia: PostAttachedMediaView[];
  linkCard: PostLinkCardView | null;
  interactionSummary: PostInteractionSummaryView | null;
}

export interface PostDetailDto {
  postId: string;
  authorUserId: string;
  postKind: PostKind;
  replyToPostId: string | null;
  quoteOfPostId: string | null;
  repostOfPostId: string | null;
  rootPostId: string | null;
  bodyText: string | null;
  status: PostReadStatus;
  author: UserIdentityBriefView | null;
  community: {
    communityId: string;
    slug: string | null;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  attachedMedia: PostAttachedMediaView[];
  hashtags: Array<{ tagNormalized: string }>;
  linkCard: PostLinkCardView | null;
  interactionSummary: PostInteractionSummaryView;
  interactionPermission: {
    canView: boolean;
    canLike: boolean;
    canBookmark: boolean;
    canComment: boolean;
    canQuote: boolean;
    canRepost: boolean;
  };
  publishedAtIso: string | null;
}

export interface ReplyRelationMetaView {
  commentId: string;
  authorUserId: string;
  parentCommentId: string | null;
  topLevelCommentId: string | null;
  depth: number;
  status: 'ACTIVE' | 'DELETED' | 'HIDDEN';
  createdAtIso: string;
  activatedAtIso: string;
}

export interface ReplyPostListItemView {
  relation: ReplyRelationMetaView;
  postCard: PostCardBriefView | null;
  tombstone: {
    state: 'DELETED' | 'HIDDEN';
  } | null;
}

export type RelationPostListDegradedReason = 'CARD_SURFACE_SHORT_PAGE' | 'REPLY_TOMBSTONE_EXPOSED';

export interface ReplyListPageView {
  list: ReplyPostListItemView[];
  nextCursor: string | null;
  degraded: boolean;
  degradedReasons: RelationPostListDegradedReason[];
  pageMayBeShort: boolean;
  filteredCountHint: number;
}

export interface CreateCommentResult {
  comment: CommentRelationPublicDto;
  counters: PostInteractionCountersPublicDto;
  derivedPostPublish: DerivedPostPublishPublicDto;
}

export interface DeleteCommentResult {
  commentId: string;
  deleted: true;
  noOp: boolean;
  outcome: PostDeleteOutcome;
  counters: PostInteractionCountersPublicDto | null;
}

export interface CreateRepostResult {
  repostId: string;
  repostPostId: string;
  sourcePostId: string;
  reposted: true;
  noOp: boolean;
}

export interface CancelRepostResult {
  repostId: string | null;
  sourcePostId: string;
  canceled: true;
  noOp: boolean;
}
