import { delay, http, HttpResponse } from 'msw';
import type {
  CommunityAssignableMemberRole,
  CommunityCardBriefView,
  CommunitySummary,
  CreateCommunityInput,
  CommunityDetailView,
  CommunityJoinRequestListItemView,
  CommunityJoinRequestStatus,
  CommunityManagementOverviewDailyItemView,
  CommunityMemberListItemView,
  CommunityModerationActionType,
  CommunityModerationLogItemView,
  CommunityModerationMetadata,
  CommunityProfileSnapshot,
  CommunitySettingsSnapshot,
  CommunityPinnedPostListItemView,
  CommunityPinType,
  UpdateCommunitySettingsField,
  UpdateCommunitySettingsInput,
  UserPublicCardView,
} from '@/domains/communities/model/types';
import type { FeedListItemDto } from '@/domains/feed/model/types';
import type { NotificationItem, UnreadSummary } from '@/domains/notifications/model/types';
import type {
  BookmarkCollectionItemCardView,
  BookmarkCollectionSummary,
  PostBrowseHistoryItemView,
  RecordPostBrowseHistoryInput,
} from '@/domains/library/model/types';
import {
  MEDIA_IMAGE_MAX_BYTES,
  MEDIA_IMAGE_MIME_TYPES,
  MEDIA_POST_IMAGE_MAX_BYTES,
  MEDIA_POST_MAX_FILES,
  MEDIA_POST_VIDEO_MAX_BYTES,
  MEDIA_VIDEO_MIME_TYPES,
} from '@/domains/media/model/constraints';
import type {
  ConfirmMediaAssetUploadedInput,
  CreateMediaUploadSessionItem,
  MediaAssetScene,
  MediaAssetStatus,
  UploadableMediaKind,
} from '@/domains/media/model/types';
import {
  POST_GENERAL_PERMISSIONS,
  POST_SOURCE_PERMISSIONS,
  POST_VISIBILITIES,
} from '@/domains/posts/model/types';
import type {
  CreateCommentResult,
  CreateTextEngagementInput,
  DeleteCommentResult,
  PostComposeInput,
  PostCardBriefView,
  PostDetailDto,
  PostDraftComposeView,
  PostDraftDetailView,
  PostDraftListItemView,
  PostInteractionCountersPublicDto,
  PublishPostDirectInput,
  RelationPostListDegradedReason,
  ReplyListPageView,
  ReplyPostListItemView,
} from '@/domains/posts/model/types';
import { hasPostComposeContent, toPostComposeInput } from '@/domains/posts/lib/compose';
import type {
  BlockedUserManagementListItemView,
  BlockUserResult,
  CancelFollowRequestResult,
  CurrentUserCardView,
  DeleteUserRelationResult,
  FollowUserResult,
  RejectFollowRequestResult,
  UnfollowUserResult,
  UpsertUserMuteResult,
  UserListItemView,
  UserManagementListItemView,
  UserProfileEditableView,
  UserProfileHeaderView,
  UserRelationSnapshotView,
} from '@/domains/users/model/types';
import type { UpdateOwnProfileRequest } from '@/domains/users/api/usersApi';
import { requireArrayItem } from '@/shared/lib/array';
import { isDateOnly } from '@/shared/lib/date';
import { canonicalizeHttpUrl } from '@/shared/lib/url';
import {
  communities,
  contentCenterDrafts,
  currentUser,
  deletedContent,
  incomingFollowRequests,
  notifications,
  posts,
  userProfileHeaders,
  users,
} from './fixtures';

const ok = <T>(data: T) => HttpResponse.json({ code: 'OK', message: 'success', data });
const apiError = (httpStatus: number, code: string, message: string) =>
  HttpResponse.json({ code, message, data: null }, { status: httpStatus });
const cursorPage = <T>(list: T[]) => ({ list, nextCursor: null, hasMore: false });

function cursorPageView<T>(list: T[], request: Request) {
  const search = new URL(request.url).searchParams;
  const limit = Math.min(100, Math.max(1, Number(search.get('limit') ?? 20)));
  const rawCursor = search.get('cursor');
  const offset = rawCursor?.startsWith('offset:')
    ? Math.max(0, Number(rawCursor.slice('offset:'.length)) || 0)
    : 0;
  const page = list.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  return {
    list: page,
    nextCursor: nextOffset < list.length ? `offset:${nextOffset}` : null,
  };
}

let mockNotifications: NotificationItem[] = notifications.map((item) => ({ ...item }));
let mockIncomingFollowRequests = incomingFollowRequests.map((item) => ({ ...item }));

interface MockMediaAsset {
  mediaAssetId: string;
  clientUploadId: string;
  scene: MediaAssetScene;
  assetKind: UploadableMediaKind;
  fileName: string;
  contentType: string;
  sizeInBytes: string;
  objectKey: string;
  uploadSessionRevision: string;
  status: MediaAssetStatus;
  confirmCount: number;
}

interface MockCreatedCommunity {
  summary: CommunitySummary;
  input: CreateCommunityInput;
}

const mockMediaAssetsById = new Map<string, MockMediaAsset>();
const mockMediaAssetsByBusinessKey = new Map<string, MockMediaAsset>();
let mockCreatedCommunities: MockCreatedCommunity[] = [];

function allCommunitySummaries(): CommunitySummary[] {
  return [...mockCreatedCommunities.map((item) => item.summary), ...communities];
}

function mockCommunityCard(summary: CommunitySummary): CommunityCardBriefView {
  const created = mockCreatedCommunities.find((item) => item.summary.id === summary.id);
  const managed = summary.id === MOCK_COMMUNITY_ID;
  return {
    communityId: summary.id,
    slug: summary.slug,
    name: summary.name,
    description: summary.description || null,
    avatarKey: null,
    avatarUrl: summary.avatarUrl,
    coverKey: null,
    coverUrl: null,
    categoryKey: created?.input.categoryKey ?? (managed ? 'AI_PRODUCT' : null),
    tags: created?.input.tags ?? [],
    status: 'ACTIVE',
    visibility: managed ? mockCommunitySettings.visibility : 'PUBLIC',
    joinPolicy: managed ? mockCommunitySettings.joinPolicy : (created?.input.joinPolicy ?? 'OPEN'),
    memberCount: managed ? mockCommunityMembers.length : summary.membersCount,
    postCount: managed ? posts.length : 0,
    pinnedPostCount: managed ? mockCommunityPinnedPosts.length : 0,
    ownerUserId: currentUser.id,
    createdAtIso: managed ? MOCK_COMMUNITY_CREATED_AT : '2026-07-01T00:00:00.000Z',
    updatedAtIso: managed ? mockCommunityUpdatedAtIso : '2026-07-28T00:00:00.000Z',
  };
}
function mediaBusinessKey(scene: MediaAssetScene, clientUploadId: string): string {
  return `${scene}:${clientUploadId}`;
}

function mockUploadTicket(asset: MockMediaAsset) {
  const expiresInSeconds = 900;
  return {
    token: `mock-upload-token-${asset.mediaAssetId}`,
    objectKey: asset.objectKey,
    bucket: 'mock-public-media',
    uploadSessionRevision: asset.uploadSessionRevision,
    region: 'z0',
    expiresInSeconds,
    expiresAtIso: new Date(Date.now() + expiresInSeconds * 1_000).toISOString(),
    sdkScriptUrl: '/mock-qiniu-sdk.js',
    recommendedClientConfig: {
      useCdnDomain: true,
      checkByMD5: false,
      forceDirect: false,
      chunkSizeMB: 4,
    },
  };
}

function findReadyMockMedia(storageKey: string, scene: MediaAssetScene): MockMediaAsset | null {
  for (const asset of mockMediaAssetsById.values()) {
    if (asset.objectKey === storageKey && asset.scene === scene && asset.status === 'READY') {
      return asset;
    }
  }
  return null;
}
const mockUserProfiles: Record<string, UserProfileHeaderView> = Object.fromEntries(
  Object.entries(userProfileHeaders).map(([handle, profile]) => [
    handle,
    {
      ...profile,
      stats: { ...profile.stats },
      relationship: profile.relationship ? { ...profile.relationship } : null,
    },
  ]),
);

let mockEditableProfile: UserProfileEditableView = {
  userId: currentUser.id,
  displayName: currentUser.displayName,
  bio: currentUser.bio ?? null,
  location: currentUser.location ?? null,
  websiteUrl: currentUser.website ?? null,
  birthday: null,
  avatarStorageKey: null,
  coverStorageKey: null,
  avatarUrl: currentUser.avatarUrl,
  coverUrl: currentUser.coverUrl,
  avatarMediaState: currentUser.avatarUrl ? 'READY' : 'MISSING',
  coverMediaState: currentUser.coverUrl ? 'READY' : 'MISSING',
  updatedAt: '2026-07-27T10:00:00.000Z',
};

type MockProfilePatchParseResult =
  { ok: true; value: UpdateOwnProfileRequest } | { ok: false; message: string };

function parseMockProfilePatch(raw: unknown): MockProfilePatchParseResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: '资料更新请求必须是对象' };
  }
  const input = raw as Record<string, unknown>;
  const allowedKeys = new Set([
    'displayName',
    'bio',
    'location',
    'websiteUrl',
    'birthday',
    'avatarStorageKey',
    'coverStorageKey',
  ]);
  const keys = Object.keys(input);
  if (keys.length === 0) return { ok: false, message: '资料更新内容不能为空' };
  if (keys.some((key) => !allowedKeys.has(key))) {
    return { ok: false, message: '资料字段不受支持' };
  }

  const patch: UpdateOwnProfileRequest = {};
  if ('displayName' in input) {
    if (typeof input.displayName !== 'string') {
      return { ok: false, message: '展示名称必须是字符串' };
    }
    const displayName = input.displayName.trim();
    if (!displayName || displayName.length > 50) {
      return { ok: false, message: '展示名称长度必须为 1 到 50 个字符' };
    }
    patch.displayName = displayName;
  }

  for (const [key, maxLength] of [
    ['bio', 160],
    ['location', 50],
  ] as const) {
    if (!(key in input)) continue;
    const rawValue = input[key];
    if (rawValue === null) {
      patch[key] = null;
      continue;
    }
    if (typeof rawValue !== 'string') {
      return { ok: false, message: `${key} 必须是字符串或 null` };
    }
    const value = rawValue.trim();
    if (value.length > maxLength) {
      return { ok: false, message: `${key} 长度超过限制` };
    }
    patch[key] = value || null;
  }

  if ('websiteUrl' in input) {
    const rawValue = input.websiteUrl;
    if (rawValue === null) patch.websiteUrl = null;
    else if (typeof rawValue !== 'string' || rawValue.trim().length > 2048) {
      return { ok: false, message: '个人网站格式不正确' };
    } else {
      try {
        patch.websiteUrl = canonicalizeHttpUrl(rawValue);
      } catch {
        return { ok: false, message: '个人网站格式不正确' };
      }
    }
  }

  if ('birthday' in input) {
    const rawValue = input.birthday;
    if (rawValue === null) patch.birthday = null;
    else if (typeof rawValue !== 'string' || !isDateOnly(rawValue)) {
      return { ok: false, message: '生日必须是有效的 YYYY-MM-DD 日期' };
    } else patch.birthday = rawValue;
  }

  for (const key of ['avatarStorageKey', 'coverStorageKey'] as const) {
    if (!(key in input)) continue;
    const rawValue = input[key];
    if (rawValue === null) {
      patch[key] = null;
      continue;
    }
    if (typeof rawValue !== 'string' || !rawValue.trim()) {
      return { ok: false, message: `${key} 必须是非空字符串或 null` };
    }
    patch[key] = rawValue.trim();
  }

  return { ok: true, value: patch };
}

function relationSummary(relation: UserRelationSnapshotView): UserRelationSnapshotView['summary'] {
  if (relation.isSelf) return 'SELF';
  if (relation.blockedByViewer) return 'BLOCKED_BY_VIEWER';
  if (relation.blockedByTarget) return 'BLOCKED_BY_TARGET';
  if (relation.outgoingFollowRequestPending) return 'REQUESTED_OUTGOING';
  if (relation.incomingFollowRequestPending) return 'REQUESTED_INCOMING';
  if (relation.following && relation.followedBy) return 'MUTUAL';
  if (relation.following) return 'FOLLOWING';
  if (relation.followedBy) return 'FOLLOWED_BY';
  return 'NONE';
}

function updateMockRelation<TActionResult extends string>(
  handle: string,
  patch: Partial<UserRelationSnapshotView>,
  actionResult: TActionResult,
) {
  const profile = mockUserProfiles[handle];
  if (!profile) {
    return {
      targetUserId: `missing:${handle}`,
      actionResult,
      targetState: 'TARGET_NOT_FOUND' as const,
      relationship: null,
    };
  }
  const current = profile.relationship ?? {
    viewerUserId: currentUser.id,
    targetUserId: profile.userId,
    isSelf: false,
    following: false,
    followedBy: false,
    outgoingFollowRequestPending: false,
    incomingFollowRequestPending: false,
    mutePosts: false,
    muteNotifications: false,
    blockedByViewer: false,
    blockedByTarget: false,
    summary: 'NONE' as const,
  };
  const relationship = { ...current, ...patch };
  relationship.summary = relationSummary(relationship);
  profile.relationship = relationship;
  return {
    targetUserId: profile.userId,
    actionResult,
    targetState: 'FOUND' as const,
    relationship,
  };
}

function mockRelationTargetNotFound(handle: string) {
  return mockUserProfiles[handle]
    ? null
    : apiError(404, 'USER_RELATION_TARGET_NOT_FOUND', '关系目标用户不存在');
}

interface MockFollowListEdge {
  userId: string;
  followedAt: string;
}

interface MockMuteRecord {
  targetUserId: string;
  mutePosts: boolean;
  muteNotifications: boolean;
  updatedAt: string;
}

interface MockBlockRecord {
  targetUserId: string;
  updatedAt: string;
  canUnblock: boolean;
}

const mockFollowersByHandle: Record<string, MockFollowListEdge[]> = {
  zhiqiu: [
    { userId: 'u-xm', followedAt: '2026-07-27T08:00:00.000Z' },
    { userId: 'u-travel', followedAt: '2026-07-26T08:00:00.000Z' },
    { userId: 'u-pm', followedAt: '2026-07-24T08:00:00.000Z' },
  ],
  xiaoming: [{ userId: currentUser.id, followedAt: '2026-07-25T08:00:00.000Z' }],
  travel_log: [],
  pm_helper: [],
  aqiang_dev: [],
};

const mockFollowingByHandle: Record<string, MockFollowListEdge[]> = {
  zhiqiu: [{ userId: 'u-xm', followedAt: '2026-07-25T08:00:00.000Z' }],
  xiaoming: [{ userId: currentUser.id, followedAt: '2026-07-27T08:00:00.000Z' }],
  travel_log: [{ userId: currentUser.id, followedAt: '2026-07-26T08:00:00.000Z' }],
  pm_helper: [{ userId: currentUser.id, followedAt: '2026-07-24T08:00:00.000Z' }],
  aqiang_dev: [],
};

let mockMuteRecords: MockMuteRecord[] = [
  {
    targetUserId: 'u-dev',
    mutePosts: true,
    muteNotifications: true,
    updatedAt: '2026-07-27T12:00:00.000Z',
  },
  {
    targetUserId: 'u-xm',
    mutePosts: false,
    muteNotifications: true,
    updatedAt: '2026-07-26T12:00:00.000Z',
  },
];

let mockBlockRecords: MockBlockRecord[] = [
  {
    targetUserId: 'u-travel',
    updatedAt: '2026-07-25T12:00:00.000Z',
    canUnblock: true,
  },
  {
    targetUserId: 'u-disabled',
    updatedAt: '2026-07-20T12:00:00.000Z',
    canUnblock: false,
  },
];

function seedMockRelation(handle: string, patch: Partial<UserRelationSnapshotView>): void {
  const profile = mockUserProfiles[handle];
  if (!profile?.relationship) return;
  const relationship = { ...profile.relationship, ...patch };
  relationship.summary = relationSummary(relationship);
  profile.relationship = relationship;
}

seedMockRelation('xiaoming', {
  following: true,
  followedBy: true,
  mutePosts: false,
  muteNotifications: true,
});
seedMockRelation('aqiang_dev', {
  mutePosts: true,
  muteNotifications: true,
});
seedMockRelation('travel_log', {
  blockedByViewer: true,
  following: false,
  followedBy: false,
  outgoingFollowRequestPending: false,
  incomingFollowRequestPending: false,
});
seedMockRelation('pm_helper', {
  followedBy: true,
  outgoingFollowRequestPending: true,
});

function mockUserById(userId: string) {
  return users.find((user) => user.id === userId) ?? null;
}

function mockRelationshipByUserId(userId: string): UserRelationSnapshotView | null {
  const user = mockUserById(userId);
  const relationship = user ? mockUserProfiles[user.handle]?.relationship : null;
  return relationship ? { ...relationship } : null;
}

function mockMuteByUserId(userId: string): MockMuteRecord | null {
  return mockMuteRecords.find((record) => record.targetUserId === userId) ?? null;
}

function isMockBlocked(userId: string): boolean {
  return mockBlockRecords.some((record) => record.targetUserId === userId);
}

function toUserListItem(edge: MockFollowListEdge): UserListItemView | null {
  const user = mockUserById(edge.userId);
  if (!user) return null;
  const relationship = mockRelationshipByUserId(user.id);
  const muteRecord = mockMuteByUserId(user.id);
  return {
    userId: user.id,
    handle: user.handle,
    displayName: user.displayName,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl,
    relationship,
    followedAt: edge.followedAt,
    followRequestId: relationship?.outgoingFollowRequestPending
      ? `outgoing-request-${user.id}`
      : null,
    muted: muteRecord
      ? {
          mutePosts: muteRecord.mutePosts,
          muteNotifications: muteRecord.muteNotifications,
        }
      : null,
    blocked: isMockBlocked(user.id),
  };
}

function toManagementListItem(userId: string): UserManagementListItemView {
  const user = mockUserById(userId);
  if (!user) {
    return {
      userId,
      handle: null,
      displayName: null,
      bio: null,
      avatarUrl: null,
      relationship: null,
      cardState: 'PLACEHOLDER',
      placeholderReason: 'ACCOUNT_DISABLED',
      followedAt: null,
      followRequestId: null,
      muted: null,
      blocked: isMockBlocked(userId),
    };
  }
  const muteRecord = mockMuteByUserId(user.id);
  return {
    userId: user.id,
    handle: user.handle,
    displayName: user.displayName,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl,
    relationship: mockRelationshipByUserId(user.id),
    cardState: 'FULL',
    placeholderReason: null,
    followedAt: null,
    followRequestId: null,
    muted: muteRecord
      ? {
          mutePosts: muteRecord.mutePosts,
          muteNotifications: muteRecord.muteNotifications,
        }
      : null,
    blocked: isMockBlocked(user.id),
  };
}

function pagedMockList<T>(request: Request, list: T[]) {
  const url = new URL(request.url);
  const limitValue = Number(url.searchParams.get('limit') ?? '20');
  const limit = Number.isInteger(limitValue) ? Math.min(Math.max(limitValue, 1), 50) : 20;
  const cursor = url.searchParams.get('cursor');
  const parsedOffset = cursor?.match(/^mock-offset-(\d+)$/)?.[1];
  const offset = parsedOffset ? Number(parsedOffset) : 0;
  const page = list.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  return {
    list: page,
    nextCursor: nextOffset < list.length ? `mock-offset-${nextOffset}` : null,
  };
}

function mockUserConnectionList(
  handle: string,
  request: Request,
  edgesByHandle: Readonly<Record<string, readonly MockFollowListEdge[]>>,
) {
  if (!mockUserProfiles[handle]) {
    return apiError(404, 'USER_PROFILE_NOT_FOUND', '用户不存在');
  }

  const list = (edgesByHandle[handle] ?? [])
    .map(toUserListItem)
    .filter((item): item is UserListItemView => Boolean(item));
  return ok(pagedMockList(request, list));
}

function addMockFollowEdge(targetHandle: string): void {
  const target = users.find((user) => user.handle === targetHandle);
  if (!target) return;
  const now = new Date().toISOString();
  const ownFollowing = (mockFollowingByHandle[currentUser.handle] ??= []);
  if (!ownFollowing.some((edge) => edge.userId === target.id)) {
    ownFollowing.unshift({ userId: target.id, followedAt: now });
  }
  const targetFollowers = (mockFollowersByHandle[target.handle] ??= []);
  if (!targetFollowers.some((edge) => edge.userId === currentUser.id)) {
    targetFollowers.unshift({ userId: currentUser.id, followedAt: now });
  }
}

function removeMockFollowEdge(targetHandle: string): void {
  const target = users.find((user) => user.handle === targetHandle);
  if (!target) return;
  mockFollowingByHandle[currentUser.handle] = (
    mockFollowingByHandle[currentUser.handle] ?? []
  ).filter((edge) => edge.userId !== target.id);
  mockFollowersByHandle[target.handle] = (mockFollowersByHandle[target.handle] ?? []).filter(
    (edge) => edge.userId !== currentUser.id,
  );
}

interface MockCommunitySettings extends Required<UpdateCommunitySettingsInput> {
  settingsVersion: number;
  updatedAtIso: string;
}

const MOCK_COMMUNITY_ID = 'c-1';
const MOCK_COMMUNITY_CREATED_AT = '2025-02-01T08:00:00.000Z';

function mockUserPublicCard(userId: string): UserPublicCardView | null {
  const user = users.find((candidate) => candidate.id === userId);
  if (!user) return null;
  const profile = userProfileHeaders[user.handle];
  return {
    userId: user.id,
    handle: user.handle,
    displayName: user.displayName,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl,
    followersCount: user.followersCount ?? 0,
    profileVersion: profile?.profileVersion ?? null,
    source: 'PROJECTION',
    freshness: profile?.profileVersion ? 'VERSIONED' : 'BEST_EFFORT',
    relationship: profile?.relationship ? { ...profile.relationship } : null,
  };
}

function mockJoinApplicantEntry(
  userId: string,
): CommunityJoinRequestListItemView['applicantEntry'] {
  const user = users.find((candidate) => candidate.id === userId);
  const profile = user ? userProfileHeaders[user.handle] : null;
  if (!user || !profile?.relationship) {
    return {
      userId,
      handle: null,
      displayName: null,
      bio: null,
      avatarUrl: null,
      relationship: null,
      cardState: 'PLACEHOLDER',
      placeholderReason: 'ACCOUNT_DISABLED',
    };
  }
  return {
    userId: user.id,
    handle: user.handle,
    displayName: user.displayName,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl,
    relationship: { ...profile.relationship },
    cardState: 'FULL',
    placeholderReason: null,
  };
}

function mockPostCard(postId: string): PostCardBriefView | null {
  const post = posts.find((candidate) => candidate.id === postId);
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
  const post = posts.find((candidate) => candidate.id === postId);
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
  const post = posts.find((candidate) => candidate.id === postId);
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

const MOCK_DEFAULT_BOOKMARK_COLLECTION_ID = 'bookmark-default';
const MOCK_DESIGN_BOOKMARK_COLLECTION_ID = 'bookmark-design';
const MOCK_TRAVEL_BOOKMARK_COLLECTION_ID = 'bookmark-travel';

let mockBookmarkCollections: BookmarkCollectionSummary[] = [
  {
    collectionId: MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
    name: '全部收藏',
    kind: 'DEFAULT',
    visibility: 'PRIVATE',
    itemCount: 0,
    updatedAtIso: '2026-07-27T09:30:00.000Z',
    lastItemAddedAtIso: '2026-07-27T09:30:00.000Z',
  },
  {
    collectionId: MOCK_DESIGN_BOOKMARK_COLLECTION_ID,
    name: '产品设计',
    kind: 'CUSTOM',
    visibility: 'PRIVATE',
    itemCount: 0,
    updatedAtIso: '2026-07-26T10:00:00.000Z',
    lastItemAddedAtIso: '2026-07-26T10:00:00.000Z',
  },
  {
    collectionId: MOCK_TRAVEL_BOOKMARK_COLLECTION_ID,
    name: '旅行灵感',
    kind: 'CUSTOM',
    visibility: 'FOLLOWERS',
    itemCount: 0,
    updatedAtIso: '2026-07-20T12:00:00.000Z',
    lastItemAddedAtIso: null,
  },
];

let mockBookmarkItems: BookmarkCollectionItemCardView[] = [
  {
    bookmarkItemId: 'bookmark-item-1',
    postId: 'post-1',
    bookmarkCollectionId: MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
    savedAtIso: '2026-07-27T09:30:00.000Z',
    itemState: 'ACTIVE',
    placeholderReasonCode: null,
    postCard: requiredMockPostCard('post-1'),
  },
  {
    bookmarkItemId: 'bookmark-item-2',
    postId: 'post-2',
    bookmarkCollectionId: MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
    savedAtIso: '2026-07-25T07:20:00.000Z',
    itemState: 'ACTIVE',
    placeholderReasonCode: null,
    postCard: requiredMockPostCard('post-2'),
  },
  {
    bookmarkItemId: 'bookmark-item-missing',
    postId: 'post-removed',
    bookmarkCollectionId: MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
    savedAtIso: '2026-07-22T05:10:00.000Z',
    itemState: 'PLACEHOLDER',
    placeholderReasonCode: 'DENY_POST_NOT_FOUND',
    postCard: null,
  },
  {
    bookmarkItemId: 'bookmark-item-design-2',
    postId: 'post-3',
    bookmarkCollectionId: MOCK_DESIGN_BOOKMARK_COLLECTION_ID,
    savedAtIso: '2026-07-24T08:00:00.000Z',
    itemState: 'ACTIVE',
    placeholderReasonCode: null,
    postCard: requiredMockPostCard('post-3'),
  },
];

let mockContentCenterDrafts = contentCenterDrafts.map((draft) => ({
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
    const kind = mockMediaAssetsById.get(item.mediaAssetId)?.assetKind ?? 'IMAGE';
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
  const currentIndex = mockContentCenterDrafts.findIndex((item) => item.draftId === detail.draftId);
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
    const asset = mockMediaAssetsById.get(item.mediaAssetId);
    return asset?.status === 'READY' ? [] : [item.mediaAssetId];
  });
}

function addMockPublishedPost(postId: string, input: PostComposeInput): void {
  if (posts.some((post) => post.id === postId)) return;
  const community = input.communityId
    ? allCommunitySummaries().find((item) => item.id === input.communityId)
    : null;
  posts.unshift({
    id: postId,
    author: currentUser,
    authorProfileAvailable: true,
    content: input.bodyText ?? '',
    createdAt: new Date().toISOString(),
    tags: input.entityRanges.flatMap((item) =>
      item.entityType === 'HASHTAG' ? [item.tagTextSnapshot] : [],
    ),
    media: input.mediaItems.map((item) => {
      const asset = mockMediaAssetsById.get(item.mediaAssetId);
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

function publishMockCompose(postId: string, input: PublishPostDirectInput) {
  const pendingMediaAssetIds = pendingMockMediaAssetIds(input);
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

const mockDeletedContent = deletedContent.map((item) => ({ ...item }));
let mockBrowseHistory: PostBrowseHistoryItemView[] = [
  {
    postId: 'post-1',
    lastViewedAtIso: '2026-07-28T01:30:00.000Z',
    viewCount: 3,
    sourceScene: 'POST_DETAIL',
    sourceModule: 'POST',
    itemState: 'ACTIVE',
    placeholderReasonCode: null,
    postCard: requiredMockPostCard('post-1'),
  },
  {
    postId: 'post-3',
    lastViewedAtIso: '2026-07-27T13:02:00.000Z',
    viewCount: 1,
    sourceScene: 'SEARCH_RESULT',
    sourceModule: 'SEARCH',
    itemState: 'ACTIVE',
    placeholderReasonCode: null,
    postCard: requiredMockPostCard('post-3'),
  },
  {
    postId: 'post-history-unavailable',
    lastViewedAtIso: '2026-07-26T14:18:00.000Z',
    viewCount: 2,
    sourceScene: 'COMMUNITY_POST',
    sourceModule: 'COMMUNITY',
    itemState: 'PLACEHOLDER',
    placeholderReasonCode: 'DENY_COMMUNITY_MEMBERSHIP_REQUIRED',
    postCard: null,
  },
];
const mockRepostedPostIds = new Set<string>();

function refreshMockBookmarkCollectionCounts(): void {
  mockBookmarkCollections = mockBookmarkCollections.map((collection) => {
    const items = mockBookmarkItems.filter(
      (item) => item.bookmarkCollectionId === collection.collectionId,
    );
    return {
      ...collection,
      itemCount: items.length,
      lastItemAddedAtIso: items[0]?.savedAtIso ?? null,
    };
  });
}

function findMockBookmarkCollection(collectionId: string): BookmarkCollectionSummary | null {
  return (
    mockBookmarkCollections.find((collection) => collection.collectionId === collectionId) ?? null
  );
}

function cloneMockPostCardForBookmark(
  postId: string,
  collectionId: string,
): PostCardBriefView | null {
  const card = mockPostCard(postId);
  if (!card) return null;
  return {
    ...card,
    interactionSummary: card.interactionSummary
      ? {
          ...card.interactionSummary,
          viewerState: card.interactionSummary.viewerState
            ? {
                ...card.interactionSummary.viewerState,
                bookmarked: true,
                bookmarkCollectionId: collectionId,
              }
            : null,
        }
      : null,
  };
}

refreshMockBookmarkCollectionCounts();

function mockCommunityMember(
  userId: string,
  role: CommunityMemberListItemView['role'],
  joinedAtIso: string,
): CommunityMemberListItemView {
  const userCard = mockUserPublicCard(userId);
  if (!userCard) throw new Error(`Missing mock member fixture: ${userId}`);
  return { userId, role, joinedAtIso, userCard };
}

let mockCommunitySettings: MockCommunitySettings = {
  visibility: 'PUBLIC',
  joinPolicy: 'APPROVAL',
  postRoleMin: 'MEMBER',
  commentRoleMin: 'VISITOR',
  quoteEnabled: true,
  repostEnabled: true,
  requireRuleAcceptanceBeforePost: true,
  settingsVersion: 4,
  updatedAtIso: '2026-07-27T10:00:00.000Z',
};

function mockCommunityProfileSnapshot(): CommunityProfileSnapshot {
  return {
    slug: 'ai-product',
    name: 'AI 产品讨论组',
    description: 'AI 产品、工作流、提示词与真实落地案例。',
    avatarKey: null,
    coverKey: null,
    categoryKey: 'AI_PRODUCT',
    tags: ['人工智能', '产品设计', '工作流'],
    locale: 'zh-CN',
    regionCode: 'CN',
  };
}

function mockCommunitySettingsSnapshot(
  settings: MockCommunitySettings = mockCommunitySettings,
): CommunitySettingsSnapshot {
  return {
    visibility: settings.visibility,
    joinPolicy: settings.joinPolicy,
    postRoleMin: settings.postRoleMin,
    commentRoleMin: settings.commentRoleMin,
    quoteEnabled: settings.quoteEnabled,
    repostEnabled: settings.repostEnabled,
    requireRuleAcceptanceBeforePost: settings.requireRuleAcceptanceBeforePost,
    settingsVersion: settings.settingsVersion,
  };
}

let mockCommunityRules = [
  '尊重他人，围绕 AI 产品与真实实践讨论',
  '禁止广告、人身攻击和未经允许的商业推广',
  '引用外部内容时请标注来源与授权状态',
];
let mockCommunityRulesVersion = 3;
let mockCommunityUpdatedAtIso = '2026-07-27T10:00:00.000Z';

let mockCommunityMembers: CommunityMemberListItemView[] = [
  mockCommunityMember('user-current', 'OWNER', '2025-02-01T08:00:00.000Z'),
  mockCommunityMember('u-xm', 'MODERATOR', '2025-05-12T08:00:00.000Z'),
  mockCommunityMember('u-dev', 'MEMBER', '2026-01-18T08:00:00.000Z'),
];

const mockCommunityJoinRequests: CommunityJoinRequestListItemView[] = [
  {
    joinRequestId: 'join-request-1',
    applicantUserId: 'u-travel',
    status: 'PENDING',
    requestMessage: '希望分享城市摄影中的 AI 后期工作流，也参与真实产品案例讨论。',
    decisionMessage: null,
    createdAtIso: '2026-07-28T07:30:00.000Z',
    reviewedAtIso: null,
    applicantEntry: mockJoinApplicantEntry('u-travel'),
  },
  {
    joinRequestId: 'join-request-2',
    applicantUserId: 'u-pm',
    status: 'PENDING',
    requestMessage: '关注 PRD、产品协作与 AI 工作流，希望参与内容共创。',
    decisionMessage: null,
    createdAtIso: '2026-07-27T13:05:00.000Z',
    reviewedAtIso: null,
    applicantEntry: mockJoinApplicantEntry('u-pm'),
  },
  {
    joinRequestId: 'join-request-history-1',
    applicantUserId: 'u-disabled',
    status: 'REJECTED',
    requestMessage: null,
    decisionMessage: '账号当前不可用。',
    createdAtIso: '2026-07-20T09:00:00.000Z',
    reviewedAtIso: '2026-07-20T10:30:00.000Z',
    applicantEntry: mockJoinApplicantEntry('u-disabled'),
  },
];

let mockCommunityPinnedPosts: CommunityPinnedPostListItemView[] = [
  {
    postId: 'post-1',
    pinType: 'NORMAL',
    sortOrder: 1,
    pinnedByUserId: currentUser.id,
    pinnedAtIso: '2026-07-26T10:20:00.000Z',
    postCard: requiredMockPostCard('post-1'),
  },
];

const mockCommunityDaily: CommunityManagementOverviewDailyItemView[] = [
  { date: '2026-07-22', newMemberCount: 3, newJoinRequestCount: 1, newPostCount: 8 },
  { date: '2026-07-23', newMemberCount: 2, newJoinRequestCount: 2, newPostCount: 6 },
  { date: '2026-07-24', newMemberCount: 4, newJoinRequestCount: 1, newPostCount: 9 },
  { date: '2026-07-25', newMemberCount: 1, newJoinRequestCount: 0, newPostCount: 5 },
  { date: '2026-07-26', newMemberCount: 5, newJoinRequestCount: 3, newPostCount: 11 },
  { date: '2026-07-27', newMemberCount: 2, newJoinRequestCount: 1, newPostCount: 7 },
  { date: '2026-07-28', newMemberCount: 1, newJoinRequestCount: 2, newPostCount: 4 },
];

let mockCommunityLogs: CommunityModerationLogItemView[] = [
  {
    logId: 'community-log-4',
    actionType: 'COMMUNITY_JOIN_REQUEST_CREATED',
    actorUserId: 'u-travel',
    targetUserId: 'u-travel',
    postId: null,
    joinRequestId: 'join-request-1',
    reason: null,
    metadata: {
      kind: 'COMMUNITY_JOIN_REQUEST_CREATED',
      applicantUserId: 'u-travel',
      requestMessage: '希望分享城市摄影中的 AI 后期工作流，也参与真实产品案例讨论。',
    },
    actorUser: mockUserPublicCard('u-travel'),
    targetUser: mockUserPublicCard('u-travel'),
    createdAtIso: '2026-07-28T07:30:00.000Z',
  },
  {
    logId: 'community-log-3',
    actionType: 'COMMUNITY_POST_PINNED',
    actorUserId: currentUser.id,
    targetUserId: null,
    postId: 'post-1',
    joinRequestId: null,
    reason: '本周精选讨论',
    metadata: {
      kind: 'COMMUNITY_PINNED_POST_CHANGED',
      postId: 'post-1',
      pinType: 'NORMAL',
      sortOrder: 1,
      action: 'PINNED',
      reason: '本周精选讨论',
      occurredAtIso: '2026-07-26T10:20:00.000Z',
    },
    actorUser: mockUserPublicCard(currentUser.id),
    targetUser: null,
    createdAtIso: '2026-07-26T10:20:00.000Z',
  },
  {
    logId: 'community-log-2',
    actionType: 'COMMUNITY_SETTINGS_UPDATED',
    actorUserId: currentUser.id,
    targetUserId: null,
    postId: null,
    joinRequestId: null,
    reason: null,
    metadata: {
      kind: 'COMMUNITY_SETTINGS_UPDATED',
      before: {
        ...mockCommunitySettingsSnapshot(),
        requireRuleAcceptanceBeforePost: false,
        settingsVersion: 3,
      },
      after: mockCommunitySettingsSnapshot(),
      updatedFields: ['requireRuleAcceptanceBeforePost'],
    },
    actorUser: mockUserPublicCard(currentUser.id),
    targetUser: null,
    createdAtIso: '2026-07-27T10:00:00.000Z',
  },
  {
    logId: 'community-log-1',
    actionType: 'COMMUNITY_CREATED',
    actorUserId: currentUser.id,
    targetUserId: null,
    postId: null,
    joinRequestId: null,
    reason: null,
    metadata: {
      kind: 'COMMUNITY_CREATED',
      profile: mockCommunityProfileSnapshot(),
      settings: {
        ...mockCommunitySettingsSnapshot(),
        settingsVersion: 1,
      },
      ruleCount: 3,
      ownerUserId: currentUser.id,
    },
    actorUser: mockUserPublicCard(currentUser.id),
    targetUser: null,
    createdAtIso: MOCK_COMMUNITY_CREATED_AT,
  },
];

function pageResult<T>(list: T[], page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return {
    list: list.slice(offset, offset + pageSize),
    total: list.length,
    page,
    pageSize,
  };
}

function addMockCommunityLog(input: {
  actionType: CommunityModerationActionType;
  targetUserId?: string | null;
  postId?: string | null;
  joinRequestId?: string | null;
  reason?: string | null;
  metadata?: CommunityModerationMetadata | null;
  createdAtIso?: string;
}) {
  const createdAtIso = input.createdAtIso ?? new Date().toISOString();
  mockCommunityLogs = [
    {
      logId: crypto.randomUUID(),
      actionType: input.actionType,
      actorUserId: currentUser.id,
      targetUserId: input.targetUserId ?? null,
      postId: input.postId ?? null,
      joinRequestId: input.joinRequestId ?? null,
      reason: input.reason ?? null,
      metadata: input.metadata ?? null,
      actorUser: mockUserPublicCard(currentUser.id),
      targetUser: input.targetUserId ? mockUserPublicCard(input.targetUserId) : null,
      createdAtIso,
    },
    ...mockCommunityLogs,
  ];
}

function mockCommunityDetail(): CommunityDetailView {
  const managerRoles = new Set(['OWNER', 'ADMIN', 'MODERATOR']);
  return {
    community: {
      communityId: MOCK_COMMUNITY_ID,
      slug: 'ai-product',
      name: 'AI 产品讨论组',
      description: 'AI 产品、工作流、提示词与真实落地案例。',
      avatarKey: null,
      avatarUrl: null,
      coverKey: null,
      coverUrl: null,
      categoryKey: 'AI_PRODUCT',
      tags: ['人工智能', '产品设计', '工作流'],
      status: 'ACTIVE',
      visibility: mockCommunitySettings.visibility,
      joinPolicy: mockCommunitySettings.joinPolicy,
      memberCount: mockCommunityMembers.length,
      postCount: posts.length,
      pinnedPostCount: mockCommunityPinnedPosts.length,
      ownerUserId: currentUser.id,
      createdAtIso: MOCK_COMMUNITY_CREATED_AT,
      updatedAtIso: mockCommunityUpdatedAtIso,
      postRoleMin: mockCommunitySettings.postRoleMin,
      commentRoleMin: mockCommunitySettings.commentRoleMin,
      quoteEnabled: mockCommunitySettings.quoteEnabled,
      repostEnabled: mockCommunitySettings.repostEnabled,
      requireRuleAcceptanceBeforePost: mockCommunitySettings.requireRuleAcceptanceBeforePost,
      rulesVersion: mockCommunityRulesVersion,
      settingsVersion: mockCommunitySettings.settingsVersion,
    },
    rules: mockCommunityRules.map((content, index) => ({ sortOrder: index + 1, content })),
    managers: mockCommunityMembers
      .filter((member) => managerRoles.has(member.role))
      .map((member) => ({
        state: 'READY' as const,
        userId: member.userId,
        role: member.role as 'OWNER' | 'ADMIN' | 'MODERATOR',
        userCard: member.userCard,
      })),
    pinnedPosts: mockCommunityPinnedPosts.map((item) => item.postCard),
    viewerContext: {
      communityId: MOCK_COMMUNITY_ID,
      status: 'ACTIVE',
      visibility: mockCommunitySettings.visibility,
      joinPolicy: mockCommunitySettings.joinPolicy,
      postRoleMin: mockCommunitySettings.postRoleMin,
      commentRoleMin: mockCommunitySettings.commentRoleMin,
      quoteEnabled: mockCommunitySettings.quoteEnabled,
      repostEnabled: mockCommunitySettings.repostEnabled,
      requireRuleAcceptanceBeforePost: mockCommunitySettings.requireRuleAcceptanceBeforePost,
      rulesVersion: mockCommunityRulesVersion,
      settingsVersion: mockCommunitySettings.settingsVersion,
      actorMembershipStatus: 'ACTIVE',
      actorRole: 'OWNER',
      actorHasAcceptedCurrentRules: true,
      canViewCommunity: true,
      canManageCommunity: true,
      canReviewJoinRequests: true,
      canPinPost: true,
      canPublishPost: true,
    },
  };
}

function mockCommunityDetailForSummary(summary: CommunitySummary): CommunityDetailView {
  if (summary.id === MOCK_COMMUNITY_ID) return mockCommunityDetail();
  const card = mockCommunityCard(summary);
  const created = mockCreatedCommunities.find((item) => item.summary.id === summary.id);
  const joined = summary.joined ?? false;
  return {
    community: {
      ...card,
      postRoleMin: 'MEMBER',
      commentRoleMin: 'VISITOR',
      quoteEnabled: true,
      repostEnabled: true,
      requireRuleAcceptanceBeforePost: false,
      rulesVersion: 1,
      settingsVersion: 1,
    },
    rules: (created?.input.rules ?? []).map((rule, index) => ({
      sortOrder: index + 1,
      content: rule,
    })),
    managers: [],
    pinnedPosts: [],
    viewerContext: {
      communityId: card.communityId,
      status: card.status,
      visibility: card.visibility,
      joinPolicy: card.joinPolicy,
      postRoleMin: 'MEMBER',
      commentRoleMin: 'VISITOR',
      quoteEnabled: true,
      repostEnabled: true,
      requireRuleAcceptanceBeforePost: false,
      rulesVersion: 1,
      settingsVersion: 1,
      actorMembershipStatus: joined ? 'ACTIVE' : 'NONE',
      actorRole: joined ? 'MEMBER' : 'VISITOR',
      actorHasAcceptedCurrentRules: joined,
      canViewCommunity: true,
      canManageCommunity: false,
      canReviewJoinRequests: false,
      canPinPost: false,
      canPublishPost: joined,
    },
  };
}
function mockCommunityOverview(days: 7 | 14 | 30) {
  const lastPostAtIso =
    posts.map((post) => post.createdAt).sort((left, right) => right.localeCompare(left))[0] ?? null;
  return {
    snapshot: {
      communityId: MOCK_COMMUNITY_ID,
      memberCount: mockCommunityMembers.length,
      pendingJoinRequestCount: mockCommunityJoinRequests.filter(
        (request) => request.status === 'PENDING',
      ).length,
      postCount: posts.length,
      pinnedPostCount: mockCommunityPinnedPosts.length,
      activeManagerCount: mockCommunityMembers.filter((member) => member.role !== 'MEMBER').length,
      lastPostAtIso,
      visibility: mockCommunitySettings.visibility,
      joinPolicy: mockCommunitySettings.joinPolicy,
      postRoleMin: mockCommunitySettings.postRoleMin,
      commentRoleMin: mockCommunitySettings.commentRoleMin,
    },
    daily: mockCommunityDaily.slice(-days),
  };
}

const mockReplyAuthor = (userId: string) => {
  const user = users.find((candidate) => candidate.id === userId);
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
  const rootPost = posts.find((post) => post.id === rootPostId);
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

function updateMockRootCommentCount(rootPostId: string, difference: number) {
  const rootPost = posts.find((post) => post.id === rootPostId);
  if (!rootPost) return;
  rootPost.stats.comments = Math.max(0, rootPost.stats.comments + difference);
}

function calculateUnreadSummary(): UnreadSummary {
  const unreadItems = mockNotifications.filter((item) => !item.readAt);
  return {
    totalUnreadCount: unreadItems.length,
    mentionUnreadCount: unreadItems.filter((item) => item.category === 'MENTION').length,
    interactionUnreadCount: unreadItems.filter((item) => item.category === 'INTERACTION').length,
    communityUnreadCount: unreadItems.filter((item) => item.category === 'COMMUNITY').length,
    systemUnreadCount: unreadItems.filter((item) => item.category === 'SYSTEM').length,
  };
}

function mockAuthSession(
  onboardingStatus:
    | 'PENDING_INTERESTS'
    | 'PENDING_RECOMMENDED_USERS'
    | 'PENDING_RECOMMENDED_COMMUNITIES'
    | 'PENDING_COMPLETE'
    | 'COMPLETED' = 'COMPLETED',
  authMethod: 'PASSWORD' | 'PHONE_CODE' | 'GOOGLE_ID_TOKEN' = 'PASSWORD',
) {
  return {
    userId: currentUser.id,
    accessToken: 'mock-access-token',
    accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
    refreshTokenExpiresAt: '2030-02-01T00:00:00.000Z',
    csrfToken: 'mock-csrf-token',
    session: {
      sessionId: 'mock-session-id',
      authMethod,
      deviceName: null,
      lastSeenAt: '2026-07-28T00:00:00.000Z',
      expiresAt: '2030-02-01T00:00:00.000Z',
    },
    onboardingStatus,
  };
}

let mockNotificationSettings = {
  userId: currentUser.id,
  rowExists: true,
  source: 'PERSISTED' as const,
  inAppChannelEnabled: true,
  emailChannelEnabled: true,
  smsChannelEnabled: false,
  followNotificationEnabled: true,
  mentionNotificationEnabled: true,
  interactionNotificationEnabled: true,
  communityNotificationEnabled: true,
  systemNotificationEnabled: true,
  onlyMutualFollowCanNotify: false,
  quietHoursEnabled: false,
  quietHoursStartMinute: null as number | null,
  quietHoursEndMinute: null as number | null,
  quietHoursTimezone: null as string | null,
  defaultCommunityNewPostMode: 'HIGHLIGHTS' as const,
  defaultCommunityAnnouncementMode: 'REALTIME' as const,
  defaultCommunityInteractionMode: 'RELATED_ONLY' as const,
  notificationPreferenceVersion: 1,
};

let mockInterestTagCodes = ['design', 'machine-learning', 'photography'];
const mockInterestTagLabels = [
  ['machine-learning', '人工智能'],
  ['design', '产品设计'],
  ['photography', '摄影'],
  ['web-development', '软件开发'],
  ['travel', '旅行'],
  ['writing', '阅读与写作'],
  ['music', '音乐'],
  ['sports', '健康生活'],
  ['databases', '数据库'],
  ['science', '科学'],
] as const;
const mockInterestTagCatalog = mockInterestTagLabels.map(
  ([interestTagCode, displayName], sortOrder) => ({
    interestTagCode,
    displayName,
    sortOrder,
    enabled: true,
  }),
);

let mockRecommendationSettings = {
  userId: currentUser.id,
  localeCode: 'zh-CN' as string | null,
  regionCode: 'CN' as string | null,
  allowPersonalizedRecommendation: true,
  allowCrossLanguageRecommendation: true,
  allowCommunityRecommendation: true,
  interestTagCodes: [...mockInterestTagCodes],
  recommendationPreferenceVersion: 1,
};

let mockSearchSettings = {
  userId: currentUser.id,
  localeCode: mockRecommendationSettings.localeCode,
  regionCode: mockRecommendationSettings.regionCode,
  searchHistoryEnabled: true,
  searchAnalyticsEnabled: true,
  allowSearchTermsForTrending: true,
  searchPreferenceVersion: 1,
};

let mockHandle = currentUser.handle;
let mockEmailValue: string | null = 'mock-user@example.test';
let mockEmailVerifiedAt: string | null = null;
let mockPhone: {
  value: string;
  isLoginEnabled: boolean;
  verifiedAt: string;
} | null = null;
let mockSessions = [
  {
    sessionId: 'mock-session-id',
    authMethod: 'PASSWORD' as const,
    deviceName: null,
    deviceFamily: 'desktop',
    browserName: 'Mock Browser',
    osName: 'Mock OS',
    lastActiveOrCreatedAtIso: '2026-08-09T01:00:00.000Z',
    createdAtIso: '2026-08-09T01:00:00.000Z',
    expiresAtIso: '2030-02-01T00:00:00.000Z',
    isCurrent: true,
    effectiveStatus: 'ACTIVE' as const,
  },
];

const baseMockPermissionPolicy = {
  accountVisibility: 'PUBLIC' as const,
  allowSearchIndex: true,
  defaultPostVisibility: 'PUBLIC' as const,
  defaultLikePermission: 'EVERYONE' as const,
  defaultBookmarkPermission: 'EVERYONE' as const,
  defaultCommentPermission: 'EVERYONE' as const,
  defaultQuotePermission: 'EVERYONE' as const,
  defaultRepostPermission: 'EVERYONE' as const,
  mentionPermission: 'EVERYONE' as const,
  followerListVisibility: 'EVERYONE' as const,
  followingListVisibility: 'EVERYONE' as const,
  birthdayVisibility: 'HIDDEN' as const,
};
let mockPermissionPolicy = { ...baseMockPermissionPolicy };
export const handlers = [
  http.post('/api/auth/refresh', async () => {
    await delay(120);
    return ok(mockAuthSession());
  }),
  http.post('/api/auth/login/password', async () => {
    await delay(250);
    return ok(mockAuthSession());
  }),
  http.post('/api/auth/login/code/request', async () => {
    await delay(160);
    return ok({ requested: true as const, expiresInSeconds: 600 });
  }),
  http.post('/api/auth/login/code/confirm', async () => {
    await delay(220);
    return ok(mockAuthSession('COMPLETED', 'PHONE_CODE'));
  }),
  http.post('/api/auth/register/email', async () => {
    await delay(260);
    return ok(mockAuthSession('PENDING_INTERESTS'));
  }),
  http.post('/api/auth/verification/phone/request', async () => {
    await delay(160);
    return ok({
      accepted: true as const,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  }),
  http.post('/api/auth/register/phone', async () => {
    await delay(260);
    return ok(mockAuthSession('PENDING_INTERESTS', 'PHONE_CODE'));
  }),
  http.post('/api/auth/password/reset/request', async () => {
    await delay(160);
    return ok({ requested: true as const });
  }),
  http.post('/api/auth/password/reset/confirm', async () => {
    await delay(220);
    return ok({ reset: true as const, userId: currentUser.id, securityVersion: 2 });
  }),
  http.get('/api/auth/account/security', () =>
    ok({
      userId: currentUser.id,
      status: 'ACTIVE' as const,
      handle: mockHandle,
      email: mockEmailValue
        ? {
            value: mockEmailValue,
            isLoginEnabled: true,
            verifiedAt: mockEmailVerifiedAt,
          }
        : null,
      phone: mockPhone,
      password: {
        configured: true,
        setAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    }),
  ),
  http.get('/api/auth/sessions', () =>
    ok({
      list: mockSessions,
      total: mockSessions.length,
      page: 1,
      pageSize: 100,
    }),
  ),
  http.delete('/api/auth/sessions/:sessionId', ({ params }) => {
    const sessionId = String(params.sessionId);
    mockSessions = mockSessions.filter((session) => session.sessionId !== sessionId);
    return ok({ revoked: true as const, sessionId });
  }),
  http.patch('/api/auth/identities/handle', async ({ request }) => {
    const body = (await request.json()) as { newHandle: string };
    mockHandle = body.newHandle;
    return ok({
      result: 'CHANGED' as const,
      userId: currentUser.id,
      handle: mockHandle,
      profileVersion: 2,
    });
  }),
  http.post('/api/auth/verification/email/request', () =>
    ok({
      accepted: true as const,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }),
  ),
  http.post('/api/auth/verification/email/confirm', () => {
    mockEmailVerifiedAt = new Date().toISOString();
    return ok({
      verified: true as const,
      userId: currentUser.id,
      identityId: 'mock-email-identity',
    });
  }),
  http.post('/api/auth/identities/email/change-primary', async ({ request }) => {
    const body = (await request.json()) as { email: string; verificationToken: string };
    const verifiedAtIso = new Date().toISOString();
    mockEmailValue = body.email;
    mockEmailVerifiedAt = verifiedAtIso;
    return ok({
      identityId: 'mock-email-primary-identity',
      email: body.email,
      isPrimary: true,
      verifiedAtIso,
    });
  }),
  http.post('/api/auth/identities/phone/bind', async ({ request }) => {
    const body = (await request.json()) as { phone: string; verificationCode: string };
    const verifiedAtIso = new Date().toISOString();
    mockPhone = {
      value: body.phone,
      isLoginEnabled: true,
      verifiedAt: verifiedAtIso,
    };
    return ok({
      identityId: 'mock-phone-identity',
      phone: body.phone,
      isPrimary: false,
      verifiedAtIso,
    });
  }),
  http.post('/api/auth/identities/phone/change-primary', async ({ request }) => {
    const body = (await request.json()) as { phone: string; verificationCode: string };
    const verifiedAtIso = new Date().toISOString();
    mockPhone = {
      value: body.phone,
      isLoginEnabled: true,
      verifiedAt: verifiedAtIso,
    };
    return ok({
      identityId: 'mock-phone-primary-identity',
      phone: body.phone,
      isPrimary: true,
      verifiedAtIso,
    });
  }),
  http.post('/api/auth/password/change', () =>
    ok({
      changed: true as const,
      userId: currentUser.id,
      securityVersion: 2,
      clientAction: 'RELOGIN_REQUIRED' as const,
    }),
  ),
  http.post('/api/auth/deactivate', () =>
    ok({
      deactivated: true as const,
      userId: currentUser.id,
      clientAction: 'RELOGIN_REQUIRED' as const,
    }),
  ),
  http.post('/api/auth/oauth/google/verify-id-token', async () => {
    await delay(220);
    return ok({ mode: 'LOGIN_SUCCESS' as const, authSession: mockAuthSession() });
  }),
  http.post('/api/auth/oauth/google/complete-profile', async () => {
    await delay(220);
    return ok(mockAuthSession('PENDING_INTERESTS', 'GOOGLE_ID_TOKEN'));
  }),
  http.get('/api/auth/onboarding/status', () =>
    ok({
      userId: currentUser.id,
      onboardingStatus: 'PENDING_INTERESTS' as const,
      completedSteps: [],
      selectedInterestTagCodes: [],
      recommendedUserIds: [],
      recommendedCommunityIds: [],
      lastStep: null,
      nextStep: 'interests' as const,
      recommendationSnapshotVersion: null,
      recommendationSnapshotPayloadHash: null,
    }),
  ),
  http.post('/api/auth/onboarding/interests', () => ok({ saved: true as const })),
  http.get('/api/auth/onboarding/recommendations/users', () =>
    ok({
      list: users.slice(0, 4).map((user, index) => ({
        userId: user.id,
        score: 1 - index * 0.1,
        reasonCode: 'INTEREST_MATCH',
        card: {
          userId: user.id,
          handle: user.handle,
          displayName: user.displayName,
          bio: user.bio ?? null,
          avatarUrl: user.avatarUrl,
          followersCount: user.followersCount ?? 0,
        },
      })),
      snapshotVersion: 1,
      snapshotPayloadHash: 'mock-user-snapshot',
      submitMode: 'SNAPSHOT' as const,
      sourceSubmitToken: null,
      submittable: true,
    }),
  ),
  http.post('/api/auth/onboarding/recommendations/users', () =>
    ok({
      retryRequired: false,
      completedSteps: ['interests', 'recommended-users'],
      lastStep: 'recommended-users' as const,
      nextStep: 'recommended-communities' as const,
    }),
  ),
  http.get('/api/auth/onboarding/recommendations/communities', () =>
    ok({
      list: allCommunitySummaries().map((summary, index) => ({
        communityId: summary.id,
        score: 1 - index * 0.1,
        reasonCode: 'INTEREST_MATCH',
        card: {
          communityId: summary.id,
          slug: summary.slug,
          displayName: summary.name,
          avatarUrl: summary.avatarUrl,
          memberCount: summary.membersCount,
          description: summary.description || null,
        },
        membership: { joined: summary.joined, pending: false },
      })),
      snapshotVersion: 1,
      snapshotPayloadHash: 'mock-community-snapshot',
      submitMode: 'SNAPSHOT' as const,
      sourceSubmitToken: null,
      submittable: true,
    }),
  ),
  http.post('/api/auth/onboarding/recommendations/communities', () =>
    ok({
      retryRequired: false,
      completedSteps: ['interests', 'recommended-users', 'recommended-communities'],
      lastStep: 'recommended-communities' as const,
      nextStep: 'complete' as const,
    }),
  ),
  http.post('/api/auth/onboarding/complete', () => ok({ onboardingStatus: 'COMPLETED' as const })),
  http.post('/api/auth/onboarding/skip', () => ok({ onboardingStatus: 'SKIPPED' as const })),
  http.post('/api/auth/logout', () => ok({ loggedOut: true as const })),
  http.get('/api/feeds/following', async () => {
    await delay(180);
    return ok(cursorPage(posts.map((post) => mockFeedListItem(post.id))));
  }),
  http.get('/api/feeds/for-you', async () => {
    await delay(180);
    return ok(cursorPage([...posts].reverse().map((post) => mockFeedListItem(post.id))));
  }),
  http.get('/api/feeds/explore/posts', () =>
    ok(cursorPage(posts.slice(0, 2).map((post) => mockFeedListItem(post.id)))),
  ),
  http.get('/api/feeds/explore/topics', () =>
    ok([
      { id: 't1', title: '#人工智能', count: 123000 },
      { id: 't2', title: '#产品设计', count: 87000 },
      { id: 't3', title: '#程序员日常', count: 61000 },
    ]),
  ),
  http.get('/api/feeds/explore/communities', () => ok(cursorPage(communities))),
  http.get('/api/search', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase() || '';
    const tab = url.searchParams.get('tab') ?? 'posts';
    if (tab === 'users') {
      return ok({
        currentTab: 'users' as const,
        list: users
          .filter((user) => user.displayName.toLowerCase().includes(q) || !q)
          .map((user) => mockUserPublicCard(user.id))
          .filter((user): user is UserPublicCardView => user !== null),
        nextCursor: null,
      });
    }
    if (tab === 'communities') {
      return ok({
        currentTab: 'communities' as const,
        list: allCommunitySummaries()
          .filter((community) => community.name.toLowerCase().includes(q) || !q)
          .map(mockCommunityCard),
        nextCursor: null,
      });
    }
    return ok({
      currentTab: 'posts' as const,
      list: posts
        .filter((post) => post.content.toLowerCase().includes(q) || !q)
        .map((post) => requiredMockPostCard(post.id)),
      nextCursor: null,
    });
  }),
  http.get('/api/posts/drafts', ({ request }) =>
    ok(cursorPageView(mockContentCenterDrafts, request)),
  ),
  http.get('/api/posts/drafts/:draftId', ({ params }) => {
    const draft = mockDraftDetails.get(String(params.draftId));
    return draft ? ok(draft) : apiError(404, 'POST_DRAFT_NOT_FOUND', '草稿不存在');
  }),
  http.post('/api/posts/drafts', async ({ request }) => {
    if (!request.headers.get('idempotency-key')) {
      return apiError(400, 'POST_IDEMPOTENCY_KEY_REQUIRED', '缺少幂等键');
    }
    const rawInput = await request.json();
    if (!isMockPostComposeInput(rawInput) || !hasPostComposeContent(rawInput)) {
      return apiError(400, 'POST_DRAFT_INPUT_INVALID', '草稿正文、媒体或链接至少需要一项');
    }

    const draftId = `draft-${crypto.randomUUID()}`;
    const updatedAtIso = new Date().toISOString();
    const detail: PostDraftDetailView = {
      draftId,
      draftVersion: 1,
      state: 'EDITABLE',
      composeSnapshot: draftComposeSnapshot(rawInput),
      validationDiagnostics: null,
      linkPreviewState: mockDraftLinkPreviewState(rawInput),
      updatedAtIso,
      lastAutosavedAtIso: null,
      lastSavedAtIso: updatedAtIso,
    };
    mockDraftDetails.set(draftId, detail);
    syncMockDraftList(detail);
    return ok({
      draftId,
      draftVersion: 1,
      saved: true as const,
      created: true as const,
      bodyTextPreview: rawInput.bodyText?.slice(0, 160) ?? null,
      updatedAtIso,
    });
  }),
  http.put('/api/posts/drafts/:draftId/autosave', ({ params, request }) =>
    updateMockDraft(String(params.draftId), request, 'AUTOSAVE'),
  ),
  http.put('/api/posts/drafts/:draftId', ({ params, request }) =>
    updateMockDraft(String(params.draftId), request, 'SAVE'),
  ),
  http.delete('/api/posts/drafts/:draftId', ({ params }) => {
    const draftId = String(params.draftId);
    const exists = removeMockDraft(draftId);
    return ok({
      draftId,
      outcome: exists ? ('DELETED_NOW' as const) : ('ALREADY_DELETED' as const),
    });
  }),
  http.post('/api/posts/drafts/:draftId/publish', async ({ params, request }) => {
    const draftId = String(params.draftId);
    const idempotencyKey = request.headers.get('idempotency-key');
    const body = (await request.json()) as { allowWaitingMediaPublish?: unknown };
    if (!idempotencyKey) {
      return apiError(400, 'POST_IDEMPOTENCY_KEY_REQUIRED', '缺少幂等键');
    }
    if (typeof body.allowWaitingMediaPublish !== 'boolean') {
      return apiError(400, 'POST_PUBLISH_INPUT_INVALID', '发布请求不合法');
    }

    const draft = mockDraftDetails.get(draftId);
    if (!draft) return apiError(404, 'POST_DRAFT_NOT_FOUND', '草稿不存在');

    const publishInput: PublishPostDirectInput = {
      ...toPostComposeInput(draft.composeSnapshot),
      allowWaitingMediaPublish: body.allowWaitingMediaPublish,
    };
    const pendingMediaAssetIds = pendingMockMediaAssetIds(publishInput);
    if (pendingMediaAssetIds.length && !body.allowWaitingMediaPublish) {
      return apiError(409, 'POST_MEDIA_NOT_READY', '媒体尚未处理完成');
    }

    const result = publishMockCompose(`published-${draftId}`, publishInput);
    removeMockDraft(draftId);
    return ok({ ...result, draftId });
  }),
  http.get('/api/posts/:postId', ({ params }) => {
    const detail = mockPostDetail(String(params.postId));
    return detail ? ok(detail) : apiError(404, 'POST_NOT_FOUND', 'Post not found');
  }),
  http.post('/api/posts/publish', async ({ request }) => {
    if (!request.headers.get('idempotency-key')) {
      return apiError(400, 'POST_IDEMPOTENCY_KEY_REQUIRED', '缺少幂等键');
    }
    const rawInput = await request.json();
    if (
      !isMockPostComposeInput(rawInput) ||
      typeof (rawInput as Partial<PublishPostDirectInput>).allowWaitingMediaPublish !== 'boolean' ||
      !hasPostComposeContent(rawInput)
    ) {
      return apiError(400, 'POST_PUBLISH_INPUT_INVALID', '发布请求不合法');
    }
    const input = rawInput as PublishPostDirectInput;
    const pendingMediaAssetIds = pendingMockMediaAssetIds(input);
    if (pendingMediaAssetIds.length && !input.allowWaitingMediaPublish) {
      return apiError(409, 'POST_MEDIA_NOT_READY', '媒体尚未处理完成');
    }
    return ok(publishMockCompose(crypto.randomUUID(), input));
  }),
  http.get('/api/posts/:postId/replies', ({ params, request }) => {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get('limit') ?? 20);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(50, Math.max(1, Math.trunc(requestedLimit)))
      : 20;
    const cursorValue = url.searchParams.get('cursor');
    const startIndex = cursorValue?.startsWith('mock-comment-cursor:')
      ? Number(cursorValue.slice('mock-comment-cursor:'.length))
      : 0;
    const allItems = mockRepliesByPostId[String(params.postId)] ?? [];
    const list = allItems.slice(startIndex, startIndex + limit);
    const nextIndex = startIndex + list.length;
    const degradedReasons: RelationPostListDegradedReason[] = list.some(
      (item) => item.tombstone !== null,
    )
      ? ['REPLY_TOMBSTONE_EXPOSED']
      : [];
    const response = {
      list,
      nextCursor: nextIndex < allItems.length ? `mock-comment-cursor:${nextIndex}` : null,
      degraded: degradedReasons.length > 0,
      degradedReasons,
      pageMayBeShort: false,
      filteredCountHint: 0,
    } satisfies ReplyListPageView;
    return ok(response);
  }),
  http.post('/api/posts/:postId/comments', async ({ params, request }) => {
    const body = (await request.json()) as CreateTextEngagementInput;
    if (!body.bodyText.trim()) return new HttpResponse(null, { status: 400 });
    const rootPostId = String(params.postId);
    const commentId = crypto.randomUUID();
    const commentPostId = crypto.randomUUID();
    const createdAtIso = new Date().toISOString();
    const item = mockReplyItem({
      commentId,
      commentPostId,
      authorUserId: currentUser.id,
      bodyText: body.bodyText,
      parentCommentId: null,
      topLevelCommentId: null,
      depth: 0,
      createdAtIso,
    });
    mockRepliesByPostId[rootPostId] = [item, ...(mockRepliesByPostId[rootPostId] ?? [])];
    mockCommentRootPostIds.set(commentId, rootPostId);
    updateMockRootCommentCount(rootPostId, 1);
    const response = {
      comment: {
        commentId,
        commentPostId,
        rootPostId,
        parentCommentId: null,
        topLevelCommentId: null,
        authorUserId: currentUser.id,
        depth: 0,
        status: 'ACTIVE',
        directReplyCount: 0,
        descendantReplyCount: 0,
        createdAtIso,
        activatedAtIso: createdAtIso,
        publishFailedAtIso: null,
        deletedAtIso: null,
      },
      counters: mockPostCounters(rootPostId),
      derivedPostPublish: {
        publishState: 'PUBLISHED',
        publishMode: 'IMMEDIATE',
        pendingMediaAssetIds: [],
      },
    } satisfies CreateCommentResult;
    return ok(response);
  }),
  http.post('/api/comments/:commentId/replies', async ({ params, request }) => {
    const parentCommentId = String(params.commentId);
    const parent = findMockComment(parentCommentId);
    if (!parent?.item.postCard || parent.item.relation.status !== 'ACTIVE') {
      return new HttpResponse(null, { status: 404 });
    }
    const body = (await request.json()) as CreateTextEngagementInput;
    if (!body.bodyText.trim()) return new HttpResponse(null, { status: 400 });
    const commentId = crypto.randomUUID();
    const commentPostId = crypto.randomUUID();
    const rootPostId = mockCommentRootPostIds.get(parentCommentId) ?? 'post-1';
    const createdAtIso = new Date().toISOString();
    const topLevelCommentId =
      parent.item.relation.topLevelCommentId ?? parent.item.relation.commentId;
    mockCommentRootPostIds.set(commentId, rootPostId);
    incrementMockChildCount(parentCommentId, 1);
    updateMockRootCommentCount(rootPostId, 1);
    const response = {
      comment: {
        commentId,
        commentPostId,
        rootPostId,
        parentCommentId,
        topLevelCommentId,
        authorUserId: currentUser.id,
        depth: parent.item.relation.depth + 1,
        status: 'ACTIVE',
        directReplyCount: 0,
        descendantReplyCount: 0,
        createdAtIso,
        activatedAtIso: createdAtIso,
        publishFailedAtIso: null,
        deletedAtIso: null,
      },
      counters: mockPostCounters(rootPostId),
      derivedPostPublish: {
        publishState: 'PUBLISHED',
        publishMode: 'IMMEDIATE',
        pendingMediaAssetIds: [],
      },
    } satisfies CreateCommentResult;
    return ok(response);
  }),
  http.delete('/api/comments/:commentId', ({ params }) => {
    const commentId = String(params.commentId);
    const found = findMockComment(commentId);
    const rootPostId = mockCommentRootPostIds.get(commentId);
    if (!found || found.item.relation.status !== 'ACTIVE') {
      const response = {
        commentId,
        deleted: true,
        noOp: true,
        outcome: 'ALREADY_DELETED',
        counters: rootPostId ? mockPostCounters(rootPostId) : null,
      } satisfies DeleteCommentResult;
      return ok(response);
    }
    found.list[found.index] = {
      relation: { ...found.item.relation, status: 'DELETED' },
      postCard: null,
      tombstone: { state: 'DELETED' },
    };
    if (rootPostId) updateMockRootCommentCount(rootPostId, -1);
    const response = {
      commentId,
      deleted: true,
      noOp: false,
      outcome: 'DELETED_NOW',
      counters: rootPostId ? mockPostCounters(rootPostId) : null,
    } satisfies DeleteCommentResult;
    return ok(response);
  }),
  http.post('/api/posts/:postId/like', () => new HttpResponse(null, { status: 204 })),
  http.delete('/api/posts/:postId/like', () => new HttpResponse(null, { status: 204 })),
  http.post('/api/posts/:postId/impressions', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/users/me/follow-requests/incoming', () =>
    ok({ list: mockIncomingFollowRequests, nextCursor: null }),
  ),
  http.post('/api/users/me/follow-requests/:followRequestId/approve', ({ params }) => {
    const followRequestId = String(params.followRequestId);
    const requestItem = mockIncomingFollowRequests.find(
      (item) => item.followRequestId === followRequestId,
    );
    if (!requestItem) {
      return apiError(404, 'USER_FOLLOW_REQUEST_NOT_FOUND', '关注请求不存在');
    }
    mockIncomingFollowRequests = mockIncomingFollowRequests.filter(
      (item) => item.followRequestId !== followRequestId,
    );
    const relationship = mockRelationshipByUserId(requestItem.userId);
    return ok({
      followRequestId,
      requesterUserId: requestItem.userId,
      targetUserId: requestItem.userId,
      targetState: relationship ? ('FOUND' as const) : ('TARGET_NOT_FOUND' as const),
      relationship,
    });
  }),
  http.post('/api/users/me/follow-requests/:followRequestId/reject', ({ params }) => {
    const followRequestId = String(params.followRequestId);
    const requestItem = mockIncomingFollowRequests.find(
      (item) => item.followRequestId === followRequestId,
    );
    if (!requestItem) {
      return apiError(404, 'USER_FOLLOW_REQUEST_NOT_FOUND', '关注请求不存在');
    }
    mockIncomingFollowRequests = mockIncomingFollowRequests.filter(
      (item) => item.followRequestId !== followRequestId,
    );
    const response = {
      followRequestId,
      requesterUserId: requestItem.userId,
      targetUserId: requestItem.userId,
      rejected: true as const,
    } satisfies RejectFollowRequestResult;
    return ok(response);
  }),
  http.get('/api/users/me', () => {
    const response = {
      userId: currentUser.id,
      handle: currentUser.handle,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
    } satisfies CurrentUserCardView;
    return ok(response);
  }),
  http.get('/api/users/me/profile', () => ok({ ...mockEditableProfile })),
  http.patch('/api/users/me/profile', async ({ request }) => {
    const parsed = parseMockProfilePatch(await request.json());
    if (!parsed.ok) {
      const code =
        parsed.message === '资料更新内容不能为空'
          ? 'USER_EMPTY_UPDATE_PAYLOAD'
          : 'USER_PROFILE_REQUEST_VALIDATION_ERROR';
      return apiError(400, code, parsed.message);
    }
    const body = parsed.value;
    const avatarAsset =
      typeof body.avatarStorageKey === 'string'
        ? findReadyMockMedia(body.avatarStorageKey, 'USER_AVATAR')
        : null;
    if (typeof body.avatarStorageKey === 'string' && !avatarAsset) {
      return apiError(400, 'MEDIA_ASSET_STATUS_NOT_USABLE', '用户头像尚未处理完成');
    }
    const coverAsset =
      typeof body.coverStorageKey === 'string'
        ? findReadyMockMedia(body.coverStorageKey, 'USER_COVER')
        : null;
    if (typeof body.coverStorageKey === 'string' && !coverAsset) {
      return apiError(400, 'MEDIA_ASSET_STATUS_NOT_USABLE', '用户封面尚未处理完成');
    }

    const profile = mockUserProfiles.zhiqiu;
    if (!profile) {
      return apiError(500, 'MOCK_PROFILE_NOT_INITIALIZED', '当前用户资料夹具未初始化');
    }
    const previous = mockEditableProfile;
    const nextAvatarStorageKey =
      body.avatarStorageKey === undefined ? previous.avatarStorageKey : body.avatarStorageKey;
    const nextCoverStorageKey =
      body.coverStorageKey === undefined ? previous.coverStorageKey : body.coverStorageKey;
    const nextAvatarUrl =
      body.avatarStorageKey === undefined
        ? previous.avatarUrl
        : nextAvatarStorageKey
          ? '/media/city.svg'
          : null;
    const nextCoverUrl =
      body.coverStorageKey === undefined
        ? previous.coverUrl
        : nextCoverStorageKey
          ? '/media/coast.svg'
          : null;
    mockEditableProfile = {
      ...previous,
      displayName: body.displayName ?? previous.displayName,
      bio: body.bio !== undefined ? body.bio : previous.bio,
      location: body.location !== undefined ? body.location : previous.location,
      websiteUrl: body.websiteUrl !== undefined ? body.websiteUrl : previous.websiteUrl,
      birthday: body.birthday !== undefined ? body.birthday : previous.birthday,
      avatarStorageKey: nextAvatarStorageKey,
      coverStorageKey: nextCoverStorageKey,
      avatarUrl: nextAvatarUrl,
      coverUrl: nextCoverUrl,
      avatarMediaState:
        body.avatarStorageKey === undefined
          ? previous.avatarMediaState
          : nextAvatarStorageKey
            ? 'READY'
            : 'MISSING',
      coverMediaState:
        body.coverStorageKey === undefined
          ? previous.coverMediaState
          : nextCoverStorageKey
            ? 'READY'
            : 'MISSING',
      updatedAt: new Date().toISOString(),
    };

    const publicProfileChanged =
      profile.displayName !== mockEditableProfile.displayName ||
      profile.bio !== mockEditableProfile.bio ||
      profile.location !== mockEditableProfile.location ||
      profile.websiteUrl !== mockEditableProfile.websiteUrl ||
      profile.avatarUrl !== mockEditableProfile.avatarUrl ||
      profile.coverUrl !== mockEditableProfile.coverUrl ||
      previous.avatarStorageKey !== mockEditableProfile.avatarStorageKey ||
      previous.coverStorageKey !== mockEditableProfile.coverStorageKey;
    profile.displayName = mockEditableProfile.displayName;
    profile.bio = mockEditableProfile.bio;
    profile.location = mockEditableProfile.location;
    profile.websiteUrl = mockEditableProfile.websiteUrl;
    profile.birthday = mockEditableProfile.birthday;
    profile.avatarUrl = mockEditableProfile.avatarUrl;
    profile.coverUrl = mockEditableProfile.coverUrl;
    if (publicProfileChanged) profile.profileVersion += 1;
    currentUser.displayName = mockEditableProfile.displayName;
    currentUser.bio = mockEditableProfile.bio ?? undefined;
    currentUser.location = mockEditableProfile.location ?? undefined;
    currentUser.website = mockEditableProfile.websiteUrl ?? undefined;
    currentUser.avatarUrl = mockEditableProfile.avatarUrl;
    currentUser.coverUrl = mockEditableProfile.coverUrl;
    return ok({ ...mockEditableProfile });
  }),
  http.get('/api/users/:handle/relationship', ({ params }) => {
    const profile = mockUserProfiles[String(params.handle)];
    return profile?.relationship
      ? ok(profile.relationship)
      : new HttpResponse(null, { status: 404 });
  }),
  http.get('/api/users/:handle', ({ params }) => {
    const profile = mockUserProfiles[String(params.handle)];
    return profile ? ok(profile) : new HttpResponse(null, { status: 404 });
  }),
  http.get('/api/users/:handle/posts', () => ok(cursorPage(posts))),
  http.get('/api/users/:handle/followers', ({ params, request }) =>
    mockUserConnectionList(String(params.handle), request, mockFollowersByHandle),
  ),
  http.get('/api/users/:handle/following', ({ params, request }) =>
    mockUserConnectionList(String(params.handle), request, mockFollowingByHandle),
  ),
  http.get('/api/users/me/mutes', ({ request }) => {
    const list = [...mockMuteRecords]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => toManagementListItem(record.targetUserId));
    return ok(pagedMockList(request, list));
  }),
  http.get('/api/users/me/blocks', ({ request }) => {
    const list = [...mockBlockRecords]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(
        (record) =>
          ({
            ...toManagementListItem(record.targetUserId),
            canUnblock: record.canUnblock,
          }) satisfies BlockedUserManagementListItemView,
      );
    return ok(pagedMockList(request, list));
  }),
  http.post('/api/users/:handle/follow', ({ params }) => {
    const handle = String(params.handle);
    const targetNotFound = mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const profile = mockUserProfiles[handle];
    const alreadyFollowing = Boolean(profile?.relationship?.following);
    if (!alreadyFollowing) addMockFollowEdge(handle);
    const response = updateMockRelation(
      handle,
      { following: true, outgoingFollowRequestPending: false },
      alreadyFollowing ? ('ALREADY_FOLLOWING' as const) : ('FOLLOWED' as const),
    ) satisfies FollowUserResult;
    return ok(response);
  }),
  http.delete('/api/users/:handle/follow', ({ params }) => {
    const handle = String(params.handle);
    const targetNotFound = mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const profile = mockUserProfiles[handle];
    const wasFollowing = Boolean(profile?.relationship?.following);
    if (wasFollowing) removeMockFollowEdge(handle);
    const response = updateMockRelation(
      handle,
      { following: false, outgoingFollowRequestPending: false },
      wasFollowing ? ('UNFOLLOWED' as const) : ('NOOP_NOT_FOLLOWING' as const),
    ) satisfies UnfollowUserResult;
    return ok(response);
  }),
  http.delete('/api/users/:handle/follow-request', ({ params }) => {
    const handle = String(params.handle);
    const targetNotFound = mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const profile = mockUserProfiles[handle];
    const wasPending = Boolean(profile?.relationship?.outgoingFollowRequestPending);
    const response = updateMockRelation(
      handle,
      { outgoingFollowRequestPending: false },
      wasPending ? ('CANCELED' as const) : ('NOOP_NOT_PENDING' as const),
    ) satisfies CancelFollowRequestResult;
    return ok(response);
  }),
  http.put('/api/users/:handle/mute', async ({ params, request }) => {
    const handle = String(params.handle);
    const targetNotFound = mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const user = users.find((candidate) => candidate.handle === handle);
    const rawBody = (await request.json()) as Record<string, unknown>;
    if (typeof rawBody.mutePosts !== 'boolean' || typeof rawBody.muteNotifications !== 'boolean') {
      return apiError(400, 'USER_MUTE_REQUEST_VALIDATION_ERROR', '静音参数不合法');
    }
    const existing = user ? mockMuteByUserId(user.id) : null;
    const bothDisabled = !rawBody.mutePosts && !rawBody.muteNotifications;
    let actionResult: UpsertUserMuteResult['actionResult'];
    if (bothDisabled) {
      actionResult = 'CANCELED_BY_FALSE_FLAGS';
      if (user) {
        mockMuteRecords = mockMuteRecords.filter((record) => record.targetUserId !== user.id);
      }
    } else if (
      existing?.mutePosts === rawBody.mutePosts &&
      existing.muteNotifications === rawBody.muteNotifications
    ) {
      actionResult = 'NOOP_SAME_FLAGS';
    } else if (existing) {
      actionResult = 'UPDATED';
      existing.mutePosts = rawBody.mutePosts;
      existing.muteNotifications = rawBody.muteNotifications;
      existing.updatedAt = new Date().toISOString();
    } else {
      actionResult = 'CREATED';
      if (user) {
        mockMuteRecords.unshift({
          targetUserId: user.id,
          mutePosts: rawBody.mutePosts,
          muteNotifications: rawBody.muteNotifications,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    const response = updateMockRelation(
      handle,
      {
        mutePosts: bothDisabled ? false : rawBody.mutePosts,
        muteNotifications: bothDisabled ? false : rawBody.muteNotifications,
      },
      actionResult,
    ) satisfies UpsertUserMuteResult;
    return ok(response);
  }),
  http.delete('/api/users/:handle/mute', ({ params }) => {
    const handle = String(params.handle);
    const targetNotFound = mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const user = users.find((candidate) => candidate.handle === handle);
    const existed = Boolean(user && mockMuteByUserId(user.id));
    if (user) {
      mockMuteRecords = mockMuteRecords.filter((record) => record.targetUserId !== user.id);
    }
    const response = updateMockRelation(
      handle,
      { mutePosts: false, muteNotifications: false },
      existed ? ('DELETED' as const) : ('NOOP_NOT_FOUND' as const),
    ) satisfies DeleteUserRelationResult;
    return ok(response);
  }),
  http.post('/api/users/:handle/block', ({ params }) => {
    const handle = String(params.handle);
    const targetNotFound = mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const user = users.find((candidate) => candidate.handle === handle);
    const existed = Boolean(user && isMockBlocked(user.id));
    if (user && !existed) {
      mockBlockRecords.unshift({
        targetUserId: user.id,
        updatedAt: new Date().toISOString(),
        canUnblock: true,
      });
      mockMuteRecords = mockMuteRecords.filter((record) => record.targetUserId !== user.id);
      removeMockFollowEdge(handle);
    }
    const response = updateMockRelation(
      handle,
      {
        blockedByViewer: true,
        following: false,
        followedBy: false,
        outgoingFollowRequestPending: false,
        incomingFollowRequestPending: false,
        mutePosts: false,
        muteNotifications: false,
      },
      existed ? ('ALREADY_BLOCKED' as const) : ('CREATED' as const),
    ) satisfies BlockUserResult;
    return ok(response);
  }),
  http.delete('/api/users/:handle/block', ({ params }) => {
    const handle = String(params.handle);
    const targetNotFound = mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const user = users.find((candidate) => candidate.handle === handle);
    const existed = Boolean(user && isMockBlocked(user.id));
    if (user) {
      mockBlockRecords = mockBlockRecords.filter((record) => record.targetUserId !== user.id);
    }
    const response = updateMockRelation(
      handle,
      { blockedByViewer: false },
      existed ? ('DELETED' as const) : ('NOOP_NOT_FOUND' as const),
    ) satisfies DeleteUserRelationResult;
    return ok(response);
  }),
  http.post('/api/media/upload-sessions', async ({ request }) => {
    const body = (await request.json()) as { items?: CreateMediaUploadSessionItem[] };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return apiError(400, 'MEDIA_UPLOAD_BATCH_EMPTY', '上传项目不能为空');
    }
    const duplicateKeys = new Set<string>();
    for (const item of body.items) {
      const key = mediaBusinessKey(item.scene, item.clientUploadId);
      if (duplicateKeys.has(key)) {
        return apiError(400, 'MEDIA_UPLOAD_BATCH_DUPLICATE_BUSINESS_KEY', '上传项目重复');
      }
      duplicateKeys.add(key);
    }

    const results = body.items.map((item) => {
      const sizeInBytes = Number(item.sizeInBytes);
      const supportedImage =
        item.assetKind === 'IMAGE' &&
        MEDIA_IMAGE_MIME_TYPES.some((mimeType) => mimeType === item.contentType);
      const supportedVideo =
        item.scene === 'POST_COMPOSE' &&
        item.assetKind === 'VIDEO' &&
        MEDIA_VIDEO_MIME_TYPES.some((mimeType) => mimeType === item.contentType);
      const sizeLimit =
        item.assetKind === 'VIDEO'
          ? MEDIA_POST_VIDEO_MAX_BYTES
          : item.scene === 'POST_COMPOSE'
            ? MEDIA_POST_IMAGE_MAX_BYTES
            : MEDIA_IMAGE_MAX_BYTES;
      const validSize =
        Number.isSafeInteger(sizeInBytes) && sizeInBytes > 0 && sizeInBytes <= sizeLimit;
      if ((!supportedImage && !supportedVideo) || !validSize) {
        return {
          clientUploadId: item.clientUploadId,
          scene: item.scene,
          assetKind: item.assetKind,
          resultType: 'REJECTED' as const,
          mediaAssetId: null,
          currentAssetStatus: null,
          ticket: null,
          errorCode: validSize ? 'MEDIA_ASSET_UNSUPPORTED_MIME' : 'MEDIA_ASSET_FILE_SIZE_INVALID',
          errorMessage: validSize
            ? item.scene === 'POST_COMPOSE'
              ? '帖子媒体仅支持 JPG、PNG、WebP、MP4、WebM 或 MOV'
              : '头像与封面仅支持图片上传'
            : `文件大小必须在 1 字节到 ${Math.floor(sizeLimit / 1024 / 1024)}MB 之间`,
        };
      }
      const businessKey = mediaBusinessKey(item.scene, item.clientUploadId);
      const existing = mockMediaAssetsByBusinessKey.get(businessKey);
      if (existing) {
        const sameIntent =
          existing.fileName === item.fileName &&
          existing.contentType === item.contentType &&
          existing.sizeInBytes === item.sizeInBytes &&
          existing.assetKind === item.assetKind;
        if (!sameIntent) {
          return {
            clientUploadId: item.clientUploadId,
            scene: item.scene,
            assetKind: item.assetKind,
            resultType: 'REJECTED' as const,
            mediaAssetId: existing.mediaAssetId,
            currentAssetStatus: existing.status,
            ticket: null,
            errorCode: 'MEDIA_UPLOAD_SESSION_CONFLICT',
            errorMessage: '同一上传标识对应的文件已发生变化',
          };
        }
        if (existing.status !== 'UPLOADING') {
          return {
            clientUploadId: item.clientUploadId,
            scene: item.scene,
            assetKind: item.assetKind,
            resultType: 'REJECTED' as const,
            mediaAssetId: existing.mediaAssetId,
            currentAssetStatus: existing.status,
            ticket: null,
            errorCode: 'MEDIA_UPLOAD_SESSION_STATE_INVALID',
            errorMessage: '上传会话已进入后续处理阶段',
          };
        }
        return {
          clientUploadId: item.clientUploadId,
          scene: item.scene,
          assetKind: item.assetKind,
          resultType: 'REPLAYED' as const,
          mediaAssetId: existing.mediaAssetId,
          currentAssetStatus: 'UPLOADING' as const,
          ticket: mockUploadTicket(existing),
          errorCode: null,
          errorMessage: null,
        };
      }

      const mediaAssetId = crypto.randomUUID();
      const asset: MockMediaAsset = {
        mediaAssetId,
        clientUploadId: item.clientUploadId,
        scene: item.scene,
        assetKind: item.assetKind,
        fileName: item.fileName,
        contentType: item.contentType,
        sizeInBytes: item.sizeInBytes,
        objectKey: `mock/${item.scene.toLowerCase()}/${crypto.randomUUID()}`,
        uploadSessionRevision: '1',
        status: 'UPLOADING',
        confirmCount: 0,
      };
      mockMediaAssetsById.set(mediaAssetId, asset);
      mockMediaAssetsByBusinessKey.set(businessKey, asset);
      return {
        clientUploadId: item.clientUploadId,
        scene: item.scene,
        assetKind: item.assetKind,
        resultType: 'CREATED' as const,
        mediaAssetId,
        currentAssetStatus: 'UPLOADING' as const,
        ticket: mockUploadTicket(asset),
        errorCode: null,
        errorMessage: null,
      };
    });

    return ok({ results });
  }),
  http.post('/api/media/assets/confirm-uploaded', async ({ request }) => {
    const body = (await request.json()) as ConfirmMediaAssetUploadedInput;
    const asset = mockMediaAssetsById.get(body.mediaAssetId);
    if (!asset) return apiError(404, 'MEDIA_ASSET_NOT_FOUND', '媒体资产不存在');
    if (
      asset.clientUploadId !== body.clientUploadId ||
      asset.uploadSessionRevision !== body.uploadSessionRevision
    ) {
      return apiError(409, 'MEDIA_ASSET_CONFIRM_STATE_INVALID', '上传确认已失效');
    }

    asset.confirmCount += 1;
    if (asset.status === 'FAILED') {
      return ok({
        mediaAssetId: asset.mediaAssetId,
        assetKind: asset.assetKind,
        currentAssetStatus: 'FAILED' as const,
        idempotent: true,
        processingAction: 'NONE' as const,
      });
    }
    if (asset.confirmCount === 1) {
      asset.status = 'UPLOADED';
      return ok({
        mediaAssetId: asset.mediaAssetId,
        assetKind: asset.assetKind,
        currentAssetStatus: 'UPLOADED' as const,
        idempotent: false,
        processingAction:
          asset.assetKind === 'IMAGE'
            ? ('IMAGE_PROCESS_ENQUEUED' as const)
            : ('VIDEO_TRANSCODE_ENQUEUED' as const),
      });
    }

    asset.status = 'READY';
    return ok({
      mediaAssetId: asset.mediaAssetId,
      assetKind: asset.assetKind,
      currentAssetStatus: 'READY' as const,
      idempotent: true,
      processingAction: 'NONE' as const,
    });
  }),
  http.post('/api/media/assets/:mediaAssetId/retry', ({ params }) => {
    const asset = mockMediaAssetsById.get(String(params.mediaAssetId));
    if (!asset) return apiError(404, 'MEDIA_ASSET_NOT_FOUND', '媒体资产不存在');
    const wasFailed = asset.status === 'FAILED';
    if (asset.status === 'FAILED') {
      asset.status = 'UPLOADED';
      asset.confirmCount = 1;
    }
    return ok({
      mediaAssetId: asset.mediaAssetId,
      assetKind: asset.assetKind,
      currentAssetStatus: asset.status,
      idempotent: !wasFailed,
      requeuedCommand: wasFailed
        ? asset.assetKind === 'IMAGE'
          ? ('IMAGE_PROCESS_REQUESTED' as const)
          : ('VIDEO_TRANSCODE_REQUESTED' as const)
        : ('NONE' as const),
    });
  }),
  http.get('/api/communities', ({ request }) => {
    const search = new URL(request.url).searchParams;
    const page = Math.max(1, Number(search.get('page') ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(search.get('pageSize') ?? 20)));
    return ok(pageResult(allCommunitySummaries().map(mockCommunityCard), page, pageSize));
  }),
  http.post('/api/communities/membership-states/_batch', async ({ request }) => {
    const body = (await request.json()) as { communityIds: string[] };
    return ok({
      list: body.communityIds.map((communityId) => {
        const summary = allCommunitySummaries().find((item) => item.id === communityId);
        return summary ? { communityId, joined: summary.joined, pending: false } : null;
      }),
    });
  }),
  http.get('/api/communities/slug/:slug/posts', () =>
    ok(cursorPage(posts.map((post) => requiredMockPostCard(post.id)))),
  ),
  http.get('/api/communities/slug/:slug', ({ params }) => {
    const summary = allCommunitySummaries().find((item) => item.slug === String(params.slug));
    return summary
      ? ok(mockCommunityDetailForSummary(summary))
      : apiError(404, 'COMMUNITY_NOT_FOUND', 'Community not found');
  }),
  http.get('/api/communities/:id', ({ params }) => {
    const summary = allCommunitySummaries().find((item) => item.id === String(params.id));
    return summary
      ? ok(mockCommunityDetailForSummary(summary))
      : apiError(404, 'COMMUNITY_NOT_FOUND', 'Community not found');
  }),
  http.post('/api/communities/:id/join', ({ params }) =>
    ok({
      communityId: String(params.id),
      result: 'ALREADY_JOINED' as const,
      membershipStatus: 'ACTIVE' as const,
      joinRequestId: null,
    }),
  ),
  http.delete('/api/communities/:id/members/me', ({ params }) =>
    ok({ communityId: String(params.id), result: 'LEFT' as const }),
  ),
  http.post('/api/communities', async ({ request }) => {
    const body = (await request.json()) as Partial<CreateCommunityInput> & Record<string, unknown>;
    const allowedKeys = new Set([
      'slug',
      'name',
      'description',
      'avatarKey',
      'coverKey',
      'categoryKey',
      'tags',
      'locale',
      'regionCode',
      'joinPolicy',
      'postRoleMin',
      'commentRoleMin',
      'quoteEnabled',
      'repostEnabled',
      'requireRuleAcceptanceBeforePost',
      'rules',
    ]);
    if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
      return apiError(400, 'VALIDATION_ERROR', '社群创建请求包含未定义字段');
    }
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (slug.length < 3 || slug.length > 32 || name.length < 2 || name.length > 64) {
      return apiError(400, 'COMMUNITY_PROFILE_INVALID', '社群名称或 Slug 不合法');
    }
    if (allCommunitySummaries().some((item) => item.slug === slug)) {
      return apiError(409, 'COMMUNITY_SLUG_ALREADY_EXISTS', '该 Slug 已被使用');
    }
    if (
      typeof body.avatarKey === 'string' &&
      !findReadyMockMedia(body.avatarKey, 'COMMUNITY_AVATAR')
    ) {
      return apiError(400, 'MEDIA_ASSET_STATUS_NOT_USABLE', '社群头像尚未处理完成');
    }
    if (
      typeof body.coverKey === 'string' &&
      !findReadyMockMedia(body.coverKey, 'COMMUNITY_COVER')
    ) {
      return apiError(400, 'MEDIA_ASSET_STATUS_NOT_USABLE', '社群封面尚未处理完成');
    }

    const communityId = crypto.randomUUID();
    const input: CreateCommunityInput = {
      slug,
      name,
      description: typeof body.description === 'string' ? body.description : null,
      avatarKey: typeof body.avatarKey === 'string' ? body.avatarKey : null,
      coverKey: typeof body.coverKey === 'string' ? body.coverKey : null,
      categoryKey: typeof body.categoryKey === 'string' ? body.categoryKey : null,
      tags: Array.isArray(body.tags)
        ? body.tags.filter((item): item is string => typeof item === 'string')
        : [],
      locale: typeof body.locale === 'string' ? body.locale : null,
      regionCode: typeof body.regionCode === 'string' ? body.regionCode : null,
      joinPolicy:
        body.joinPolicy === 'APPROVAL' || body.joinPolicy === 'INVITE_ONLY'
          ? body.joinPolicy
          : 'OPEN',
      postRoleMin:
        body.postRoleMin === 'MODERATOR' ||
        body.postRoleMin === 'ADMIN' ||
        body.postRoleMin === 'OWNER'
          ? body.postRoleMin
          : 'MEMBER',
      commentRoleMin:
        body.commentRoleMin === 'MEMBER' ||
        body.commentRoleMin === 'MODERATOR' ||
        body.commentRoleMin === 'ADMIN' ||
        body.commentRoleMin === 'OWNER'
          ? body.commentRoleMin
          : 'VISITOR',
      quoteEnabled: body.quoteEnabled !== false,
      repostEnabled: body.repostEnabled !== false,
      requireRuleAcceptanceBeforePost: body.requireRuleAcceptanceBeforePost === true,
      rules: Array.isArray(body.rules)
        ? body.rules.filter((item): item is string => typeof item === 'string')
        : [],
    };
    mockCreatedCommunities = [
      {
        input,
        summary: {
          id: communityId,
          slug,
          name,
          description: input.description ?? '',
          avatarUrl: null,
          membersCount: 1,
          joined: true,
        },
      },
      ...mockCreatedCommunities,
    ];
    return ok({
      communityId,
      slug,
      ownerUserId: currentUser.id,
      rulesVersion: 1,
      settingsVersion: 1,
    });
  }),
  http.get('/api/communities/:id/manage/overview', ({ params, request }) => {
    if (String(params.id) !== MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const rawDays = Number(new URL(request.url).searchParams.get('days') ?? 7);
    const days = rawDays === 14 || rawDays === 30 ? rawDays : 7;
    return ok(mockCommunityOverview(days));
  }),
  http.get('/api/communities/:id/manage/join-requests', ({ params, request }) => {
    if (String(params.id) !== MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const search = new URL(request.url).searchParams;
    const status = (search.get('status') ?? 'PENDING') as CommunityJoinRequestStatus;
    const page = Math.max(1, Number(search.get('page') ?? 1));
    const pageSize = Math.max(1, Number(search.get('pageSize') ?? 20));
    return ok(
      pageResult(
        mockCommunityJoinRequests.filter((item) => item.status === status),
        page,
        pageSize,
      ),
    );
  }),
  http.post(
    '/api/communities/:id/manage/join-requests/:requestId/approve',
    async ({ params, request }) => {
      if (String(params.id) !== MOCK_COMMUNITY_ID)
        return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
      const joinRequest = mockCommunityJoinRequests.find(
        (item) => item.joinRequestId === String(params.requestId),
      );
      if (!joinRequest) return apiError(404, 'COMMUNITY_JOIN_REQUEST_NOT_FOUND', '加入申请不存在');
      const body = (await request.json()) as { decisionMessage?: string | null };
      if (joinRequest.status === 'APPROVED') {
        return ok({
          communityId: MOCK_COMMUNITY_ID,
          joinRequestId: joinRequest.joinRequestId,
          applicantUserId: joinRequest.applicantUserId,
          result: 'ALREADY_APPROVED_NOOP' as const,
        });
      }
      if (joinRequest.status !== 'PENDING')
        return apiError(409, 'COMMUNITY_JOIN_REQUEST_NOT_PENDING', '申请已被处理');

      const reviewedAtIso = new Date().toISOString();
      joinRequest.status = 'APPROVED';
      joinRequest.decisionMessage = body.decisionMessage ?? null;
      joinRequest.reviewedAtIso = reviewedAtIso;
      const alreadyMember = mockCommunityMembers.some(
        (member) => member.userId === joinRequest.applicantUserId,
      );
      if (!alreadyMember) {
        const card = mockUserPublicCard(joinRequest.applicantUserId);
        if (!card) {
          joinRequest.status = 'REJECTED';
          return ok({
            communityId: MOCK_COMMUNITY_ID,
            joinRequestId: joinRequest.joinRequestId,
            applicantUserId: joinRequest.applicantUserId,
            result: 'REJECTED_AS_INELIGIBLE' as const,
          });
        }
        mockCommunityMembers = [
          ...mockCommunityMembers,
          {
            userId: joinRequest.applicantUserId,
            role: 'MEMBER',
            joinedAtIso: reviewedAtIso,
            userCard: card,
          },
        ];
      }
      addMockCommunityLog({
        actionType: 'COMMUNITY_JOIN_REQUEST_APPROVED',
        targetUserId: joinRequest.applicantUserId,
        joinRequestId: joinRequest.joinRequestId,
        reason: body.decisionMessage ?? null,
        metadata: {
          kind: 'COMMUNITY_JOIN_REQUEST_REVIEWED',
          joinRequestId: joinRequest.joinRequestId,
          applicantUserId: joinRequest.applicantUserId,
          reviewResult: 'APPROVED',
          decisionMessage: body.decisionMessage ?? null,
          reviewReasonCode: null,
          occurredAtIso: reviewedAtIso,
        },
        createdAtIso: reviewedAtIso,
      });
      return ok({
        communityId: MOCK_COMMUNITY_ID,
        joinRequestId: joinRequest.joinRequestId,
        applicantUserId: joinRequest.applicantUserId,
        result: alreadyMember
          ? ('APPROVED_REQUEST_ALREADY_ACTIVE_MEMBER' as const)
          : ('APPROVED_AND_MEMBERSHIP_ACTIVATED' as const),
      });
    },
  ),
  http.post(
    '/api/communities/:id/manage/join-requests/:requestId/reject',
    async ({ params, request }) => {
      if (String(params.id) !== MOCK_COMMUNITY_ID)
        return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
      const joinRequest = mockCommunityJoinRequests.find(
        (item) => item.joinRequestId === String(params.requestId),
      );
      if (!joinRequest) return apiError(404, 'COMMUNITY_JOIN_REQUEST_NOT_FOUND', '加入申请不存在');
      const body = (await request.json()) as { decisionMessage?: string | null };
      if (joinRequest.status === 'REJECTED') {
        return ok({
          communityId: MOCK_COMMUNITY_ID,
          joinRequestId: joinRequest.joinRequestId,
          applicantUserId: joinRequest.applicantUserId,
          result: 'ALREADY_REJECTED_NOOP' as const,
        });
      }
      if (joinRequest.status !== 'PENDING')
        return apiError(409, 'COMMUNITY_JOIN_REQUEST_NOT_PENDING', '申请已被处理');

      const reviewedAtIso = new Date().toISOString();
      joinRequest.status = 'REJECTED';
      joinRequest.decisionMessage = body.decisionMessage ?? null;
      joinRequest.reviewedAtIso = reviewedAtIso;
      addMockCommunityLog({
        actionType: 'COMMUNITY_JOIN_REQUEST_REJECTED',
        targetUserId: joinRequest.applicantUserId,
        joinRequestId: joinRequest.joinRequestId,
        reason: body.decisionMessage ?? null,
        metadata: {
          kind: 'COMMUNITY_JOIN_REQUEST_REVIEWED',
          joinRequestId: joinRequest.joinRequestId,
          applicantUserId: joinRequest.applicantUserId,
          reviewResult: 'REJECTED',
          decisionMessage: body.decisionMessage ?? null,
          reviewReasonCode: null,
          occurredAtIso: reviewedAtIso,
        },
        createdAtIso: reviewedAtIso,
      });
      return ok({
        communityId: MOCK_COMMUNITY_ID,
        joinRequestId: joinRequest.joinRequestId,
        applicantUserId: joinRequest.applicantUserId,
        result: 'REJECTED' as const,
      });
    },
  ),
  http.get('/api/communities/:id/members', ({ params, request }) => {
    if (String(params.id) !== MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const search = new URL(request.url).searchParams;
    const role = search.get('role');
    const page = Math.max(1, Number(search.get('page') ?? 1));
    const pageSize = Math.max(1, Number(search.get('pageSize') ?? 20));
    return ok(
      pageResult(
        role ? mockCommunityMembers.filter((member) => member.role === role) : mockCommunityMembers,
        page,
        pageSize,
      ),
    );
  }),
  http.patch('/api/communities/:id/manage/members/:userId/role', async ({ params, request }) => {
    if (String(params.id) !== MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const member = mockCommunityMembers.find((item) => item.userId === String(params.userId));
    if (!member) return apiError(404, 'COMMUNITY_MEMBER_NOT_FOUND', '成员不存在');
    if (member.role === 'OWNER' || member.userId === currentUser.id)
      return apiError(403, 'COMMUNITY_MEMBER_ROLE_CHANGE_FORBIDDEN', '不能修改该成员角色');
    const body = (await request.json()) as {
      nextRole: CommunityAssignableMemberRole;
      reason?: string | null;
    };
    const previousRole = member.role;
    const result = previousRole === body.nextRole ? 'NO_CHANGE' : 'CHANGED';
    if (result === 'CHANGED') {
      member.role = body.nextRole;
      addMockCommunityLog({
        actionType: 'COMMUNITY_MEMBER_ROLE_CHANGED',
        targetUserId: member.userId,
        reason: body.reason ?? null,
        metadata: {
          kind: 'COMMUNITY_ROLE_CHANGED',
          targetUserId: member.userId,
          previousRole,
          nextRole: body.nextRole,
          reason: body.reason ?? null,
        },
      });
    }
    return ok({
      communityId: MOCK_COMMUNITY_ID,
      targetUserId: member.userId,
      previousRole,
      nextRole: body.nextRole,
      result,
    });
  }),
  http.delete('/api/communities/:id/manage/members/:userId', async ({ params, request }) => {
    if (String(params.id) !== MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const targetUserId = String(params.userId);
    const member = mockCommunityMembers.find((item) => item.userId === targetUserId);
    if (!member) {
      return ok({
        communityId: MOCK_COMMUNITY_ID,
        targetUserId,
        result: 'ALREADY_REMOVED' as const,
      });
    }
    if (member.role === 'OWNER' || targetUserId === currentUser.id)
      return apiError(403, 'COMMUNITY_MEMBER_REMOVE_FORBIDDEN', '不能移除该成员');
    const body = (await request.json()) as { reason?: string | null };
    mockCommunityMembers = mockCommunityMembers.filter((item) => item.userId !== targetUserId);
    addMockCommunityLog({
      actionType: 'COMMUNITY_MEMBER_REMOVED',
      targetUserId,
      reason: body.reason ?? null,
      metadata: {
        kind: 'COMMUNITY_MEMBER_CHANGED',
        targetUserId,
        changeKind: 'REMOVED',
        previousStatus: 'ACTIVE',
        nextStatus: 'REMOVED',
      },
    });
    return ok({ communityId: MOCK_COMMUNITY_ID, targetUserId, result: 'REMOVED' as const });
  }),
  http.get('/api/communities/:id/pinned-posts', ({ params }) =>
    String(params.id) === MOCK_COMMUNITY_ID
      ? ok({
          list: [...mockCommunityPinnedPosts].sort(
            (left, right) => left.sortOrder - right.sortOrder,
          ),
          degraded: false,
          degradedReason: null,
          filteredCountHint: 0,
        })
      : apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在'),
  ),
  http.post('/api/communities/:id/manage/pinned-posts', async ({ params, request }) => {
    if (String(params.id) !== MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const body = (await request.json()) as {
      postId: string;
      pinType: CommunityPinType;
      sortOrder: number;
      reason?: string | null;
    };
    const existing = mockCommunityPinnedPosts.find((item) => item.postId === body.postId);
    if (existing) {
      if (existing.pinType === body.pinType && existing.sortOrder === body.sortOrder) {
        return ok({
          communityId: MOCK_COMMUNITY_ID,
          postId: body.postId,
          pinType: body.pinType,
          sortOrder: body.sortOrder,
          result: 'ALREADY_PINNED' as const,
        });
      }
      return apiError(409, 'COMMUNITY_PIN_POST_ALREADY_PINNED', '帖子已在其它置顶状态');
    }
    if (mockCommunityPinnedPosts.some((item) => item.sortOrder === body.sortOrder))
      return apiError(409, 'COMMUNITY_PIN_SLOT_OCCUPIED', '目标置顶槽位已被占用');
    const postCard = mockPostCard(body.postId);
    if (!postCard) return apiError(404, 'COMMUNITY_PIN_POST_NOT_FOUND', '帖子不存在或不可置顶');
    const pinnedAtIso = new Date().toISOString();
    mockCommunityPinnedPosts = [
      ...mockCommunityPinnedPosts,
      {
        postId: body.postId,
        pinType: body.pinType,
        sortOrder: body.sortOrder,
        pinnedByUserId: currentUser.id,
        pinnedAtIso,
        postCard,
      },
    ];
    addMockCommunityLog({
      actionType: 'COMMUNITY_POST_PINNED',
      postId: body.postId,
      reason: body.reason ?? null,
      metadata: {
        kind: 'COMMUNITY_PINNED_POST_CHANGED',
        postId: body.postId,
        pinType: body.pinType,
        sortOrder: body.sortOrder,
        action: 'PINNED',
        reason: body.reason ?? null,
        occurredAtIso: pinnedAtIso,
      },
      createdAtIso: pinnedAtIso,
    });
    return ok({
      communityId: MOCK_COMMUNITY_ID,
      postId: body.postId,
      pinType: body.pinType,
      sortOrder: body.sortOrder,
      result: 'PINNED' as const,
    });
  }),
  http.patch(
    '/api/communities/:id/manage/pinned-posts/:postId/order',
    async ({ params, request }) => {
      if (String(params.id) !== MOCK_COMMUNITY_ID)
        return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
      const current = mockCommunityPinnedPosts.find(
        (item) => item.postId === String(params.postId),
      );
      if (!current) return apiError(404, 'COMMUNITY_PIN_POST_NOT_FOUND', '置顶帖子不存在');
      const body = (await request.json()) as { targetSortOrder: number; reason?: string | null };
      if (current.sortOrder === body.targetSortOrder) {
        return ok({
          communityId: MOCK_COMMUNITY_ID,
          postId: current.postId,
          sortOrder: current.sortOrder,
          swappedWithPostId: null,
        });
      }
      const previousSortOrder = current.sortOrder;
      const occupied = mockCommunityPinnedPosts.find(
        (item) => item.sortOrder === body.targetSortOrder,
      );
      current.sortOrder = body.targetSortOrder;
      if (occupied) occupied.sortOrder = previousSortOrder;
      const reorderedAtIso = new Date().toISOString();
      addMockCommunityLog({
        actionType: 'COMMUNITY_PINNED_POST_REORDERED',
        postId: current.postId,
        reason: body.reason ?? null,
        metadata: {
          kind: 'COMMUNITY_PINNED_POST_REORDERED',
          postId: current.postId,
          pinType: current.pinType,
          fromSortOrder: previousSortOrder,
          toSortOrder: body.targetSortOrder,
          swappedWithPostId: occupied?.postId ?? null,
          occurredAtIso: reorderedAtIso,
        },
        createdAtIso: reorderedAtIso,
      });
      return ok({
        communityId: MOCK_COMMUNITY_ID,
        postId: current.postId,
        sortOrder: current.sortOrder,
        swappedWithPostId: occupied?.postId ?? null,
      });
    },
  ),
  http.delete('/api/communities/:id/manage/pinned-posts/:postId', async ({ params, request }) => {
    if (String(params.id) !== MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const postId = String(params.postId);
    const existing = mockCommunityPinnedPosts.find((item) => item.postId === postId);
    if (!existing) {
      return ok({ communityId: MOCK_COMMUNITY_ID, postId, result: 'ALREADY_UNPINNED' as const });
    }
    const body = (await request.json()) as { reason?: string | null };
    mockCommunityPinnedPosts = mockCommunityPinnedPosts.filter((item) => item.postId !== postId);
    const unpinnedAtIso = new Date().toISOString();
    addMockCommunityLog({
      actionType: 'COMMUNITY_POST_UNPINNED',
      postId,
      reason: body.reason ?? null,
      metadata: {
        kind: 'COMMUNITY_PINNED_POST_CHANGED',
        postId,
        pinType: existing.pinType,
        sortOrder: existing.sortOrder,
        action: 'UNPINNED',
        reason: body.reason ?? null,
        occurredAtIso: unpinnedAtIso,
      },
      createdAtIso: unpinnedAtIso,
    });
    return ok({ communityId: MOCK_COMMUNITY_ID, postId, result: 'UNPINNED' as const });
  }),
  http.put('/api/communities/:id/rules', async ({ params, request }) => {
    if (String(params.id) !== MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const body = (await request.json()) as { rules: string[] };
    const canonicalRules = body.rules.map((rule) => rule.trim());
    if (
      canonicalRules.length > 10 ||
      canonicalRules.some((rule) => rule.length === 0 || rule.length > 500)
    ) {
      return apiError(400, 'COMMUNITY_RULES_INVALID', '社群规则不符合约束');
    }
    const changed = JSON.stringify(canonicalRules) !== JSON.stringify(mockCommunityRules);
    if (changed) {
      const previousRules = [...mockCommunityRules];
      const previousRulesVersion = mockCommunityRulesVersion;
      mockCommunityRules = canonicalRules;
      mockCommunityRulesVersion += 1;
      mockCommunityUpdatedAtIso = new Date().toISOString();
      addMockCommunityLog({
        actionType: 'COMMUNITY_RULES_UPDATED',
        metadata: {
          kind: 'COMMUNITY_RULES_UPDATED',
          previousRulesVersion,
          nextRulesVersion: mockCommunityRulesVersion,
          previousRules,
          nextRules: [...mockCommunityRules],
        },
        createdAtIso: mockCommunityUpdatedAtIso,
      });
    }
    return ok({
      communityId: MOCK_COMMUNITY_ID,
      rulesVersion: mockCommunityRulesVersion,
      ruleCount: mockCommunityRules.length,
      updatedAtIso: mockCommunityUpdatedAtIso,
    });
  }),
  http.patch('/api/communities/:id/settings', async ({ params, request }) => {
    if (String(params.id) !== MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const body = (await request.json()) as UpdateCommunitySettingsInput;
    const allowedKeys: UpdateCommunitySettingsField[] = [
      'visibility',
      'joinPolicy',
      'postRoleMin',
      'commentRoleMin',
      'quoteEnabled',
      'repostEnabled',
      'requireRuleAcceptanceBeforePost',
    ];
    const updatedFields = allowedKeys.filter(
      (key) => body[key] !== undefined && body[key] !== mockCommunitySettings[key],
    );
    if (updatedFields.length > 0) {
      const before = mockCommunitySettingsSnapshot();
      mockCommunitySettings = {
        ...mockCommunitySettings,
        ...body,
        settingsVersion: mockCommunitySettings.settingsVersion + 1,
        updatedAtIso: new Date().toISOString(),
      };
      mockCommunityUpdatedAtIso = mockCommunitySettings.updatedAtIso;
      addMockCommunityLog({
        actionType: 'COMMUNITY_SETTINGS_UPDATED',
        metadata: {
          kind: 'COMMUNITY_SETTINGS_UPDATED',
          before,
          after: mockCommunitySettingsSnapshot(),
          updatedFields,
        },
        createdAtIso: mockCommunitySettings.updatedAtIso,
      });
    }
    return ok({
      communityId: MOCK_COMMUNITY_ID,
      settingsVersion: mockCommunitySettings.settingsVersion,
      updatedAtIso: mockCommunitySettings.updatedAtIso,
    });
  }),
  http.get('/api/communities/:id/manage/logs', ({ params, request }) => {
    if (String(params.id) !== MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const search = new URL(request.url).searchParams;
    const actionType = search.get('actionType') as CommunityModerationActionType | null;
    const targetUserId = search.get('targetUserId');
    const page = Math.max(1, Number(search.get('page') ?? 1));
    const pageSize = Math.max(1, Number(search.get('pageSize') ?? 20));
    const filtered = mockCommunityLogs.filter(
      (item) =>
        (!actionType || item.actionType === actionType) &&
        (!targetUserId || item.targetUserId === targetUserId),
    );
    return ok(pageResult(filtered, page, pageSize));
  }),
  http.get('/api/bookmarks/collections', () => {
    refreshMockBookmarkCollectionCounts();
    return ok({ list: mockBookmarkCollections.map((collection) => ({ ...collection })) });
  }),
  http.post('/api/bookmarks/collections', async ({ request }) => {
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey) {
      return apiError(400, 'BOOKMARK_IDEMPOTENCY_KEY_REQUIRED', '缺少 Idempotency-Key');
    }
    const body = (await request.json()) as Record<string, unknown>;
    if (
      Object.keys(body).some((key) => key !== 'name') ||
      typeof body.name !== 'string' ||
      !body.name.trim()
    ) {
      return apiError(400, 'BOOKMARK_COLLECTION_NAME_INVALID', '收藏夹名称不合法');
    }
    const name = body.name.trim();
    if (mockBookmarkCollections.some((collection) => collection.name === name)) {
      return apiError(409, 'BOOKMARK_COLLECTION_NAME_CONFLICT', '收藏夹名称已存在');
    }
    const now = new Date().toISOString();
    const created: BookmarkCollectionSummary = {
      collectionId: `bookmark-${crypto.randomUUID()}`,
      name,
      kind: 'CUSTOM',
      visibility: 'PRIVATE',
      itemCount: 0,
      updatedAtIso: now,
      lastItemAddedAtIso: null,
    };
    mockBookmarkCollections = [...mockBookmarkCollections, created];
    return ok(created);
  }),
  http.patch('/api/bookmarks/collections/:id/visibility', async ({ params, request }) => {
    const collectionId = String(params.id);
    const collection = findMockBookmarkCollection(collectionId);
    if (!collection) return apiError(404, 'BOOKMARK_COLLECTION_NOT_FOUND', '收藏夹不存在');
    const body = (await request.json()) as Record<string, unknown>;
    const value = body.visibility;
    if (
      Object.keys(body).some((key) => key !== 'visibility') ||
      (value !== 'PUBLIC' && value !== 'FOLLOWERS' && value !== 'PRIVATE')
    ) {
      return apiError(400, 'BOOKMARK_COLLECTION_VISIBILITY_INVALID', '可见范围不合法');
    }
    if (collection.kind === 'DEFAULT' && value !== 'PRIVATE') {
      return apiError(409, 'BOOKMARK_DEFAULT_COLLECTION_PROTECTED', '默认收藏夹固定为私密');
    }
    const updated: BookmarkCollectionSummary = {
      ...collection,
      visibility: value,
      updatedAtIso: new Date().toISOString(),
    };
    mockBookmarkCollections = mockBookmarkCollections.map((item) =>
      item.collectionId === collectionId ? updated : item,
    );
    return ok(updated);
  }),
  http.patch('/api/bookmarks/collections/:id', async ({ params, request }) => {
    const collectionId = String(params.id);
    const collection = findMockBookmarkCollection(collectionId);
    if (!collection) return apiError(404, 'BOOKMARK_COLLECTION_NOT_FOUND', '收藏夹不存在');
    if (collection.kind === 'DEFAULT') {
      return apiError(409, 'BOOKMARK_DEFAULT_COLLECTION_PROTECTED', '默认收藏夹不可重命名');
    }
    const body = (await request.json()) as Record<string, unknown>;
    if (
      Object.keys(body).some((key) => key !== 'name') ||
      typeof body.name !== 'string' ||
      !body.name.trim()
    ) {
      return apiError(400, 'BOOKMARK_COLLECTION_NAME_INVALID', '收藏夹名称不合法');
    }
    const name = body.name.trim();
    if (
      mockBookmarkCollections.some(
        (item) => item.collectionId !== collectionId && item.name === name,
      )
    ) {
      return apiError(409, 'BOOKMARK_COLLECTION_NAME_CONFLICT', '收藏夹名称已存在');
    }
    const updated = { ...collection, name, updatedAtIso: new Date().toISOString() };
    mockBookmarkCollections = mockBookmarkCollections.map((item) =>
      item.collectionId === collectionId ? updated : item,
    );
    return ok(updated);
  }),
  http.delete('/api/bookmarks/collections/:id', ({ params }) => {
    const collectionId = String(params.id);
    const collection = findMockBookmarkCollection(collectionId);
    if (!collection) return apiError(404, 'BOOKMARK_COLLECTION_NOT_FOUND', '收藏夹不存在');
    if (collection.kind === 'DEFAULT') {
      return apiError(409, 'BOOKMARK_DEFAULT_COLLECTION_PROTECTED', '默认收藏夹不可删除');
    }
    const movedItems = mockBookmarkItems.filter(
      (item) => item.bookmarkCollectionId === collectionId,
    );
    mockBookmarkItems = mockBookmarkItems.map((item): BookmarkCollectionItemCardView => {
      if (item.bookmarkCollectionId !== collectionId) return item;
      if (item.itemState === 'ACTIVE') {
        return {
          ...item,
          bookmarkCollectionId: MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
          postCard:
            cloneMockPostCardForBookmark(item.postId, MOCK_DEFAULT_BOOKMARK_COLLECTION_ID) ??
            item.postCard,
        };
      }
      return {
        ...item,
        bookmarkCollectionId: MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
        postCard: null,
      };
    });
    mockBookmarkCollections = mockBookmarkCollections.filter(
      (item) => item.collectionId !== collectionId,
    );
    refreshMockBookmarkCollectionCounts();
    return ok({
      deleted: true as const,
      fallbackCollectionId: MOCK_DEFAULT_BOOKMARK_COLLECTION_ID,
      movedItemCount: movedItems.length,
    });
  }),
  http.get('/api/bookmarks/collections/:id/items', ({ params, request }) => {
    const collectionId = String(params.id);
    if (!findMockBookmarkCollection(collectionId)) {
      return apiError(404, 'BOOKMARK_COLLECTION_NOT_FOUND', '收藏夹不存在');
    }
    const list = mockBookmarkItems
      .filter((item) => item.bookmarkCollectionId === collectionId)
      .sort((a, b) => b.savedAtIso.localeCompare(a.savedAtIso));
    return ok(cursorPageView(list, request));
  }),
  http.post('/api/bookmarks/posts/:postId', async ({ params, request }) => {
    const postId = String(params.postId);
    const body = (await request.json()) as Record<string, unknown>;
    if (Object.keys(body).some((key) => key !== 'targetCollectionId' && key !== 'sourceScene')) {
      return apiError(400, 'BOOKMARK_REQUEST_INVALID', '收藏请求字段不合法');
    }
    const targetCollectionId =
      typeof body.targetCollectionId === 'string'
        ? body.targetCollectionId
        : MOCK_DEFAULT_BOOKMARK_COLLECTION_ID;
    if (!findMockBookmarkCollection(targetCollectionId)) {
      return apiError(404, 'BOOKMARK_COLLECTION_NOT_FOUND', '目标收藏夹不存在');
    }
    const postCard = cloneMockPostCardForBookmark(postId, targetCollectionId);
    if (!postCard) return apiError(404, 'POST_NOT_FOUND', '帖子不存在');
    const existingIndex = mockBookmarkItems.findIndex((item) => item.postId === postId);
    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      const existing = mockBookmarkItems[existingIndex];
      if (!existing) {
        return apiError(500, 'MOCK_BOOKMARK_STATE_INVALID', '收藏夹具状态不一致');
      }
      const action =
        existing.itemState === 'PLACEHOLDER'
          ? ('RESTORED' as const)
          : existing.bookmarkCollectionId === targetCollectionId
            ? ('UNCHANGED' as const)
            : ('MOVED' as const);
      const updated: BookmarkCollectionItemCardView = {
        bookmarkItemId: existing.bookmarkItemId,
        postId,
        bookmarkCollectionId: targetCollectionId,
        savedAtIso: action === 'UNCHANGED' ? existing.savedAtIso : now,
        itemState: 'ACTIVE',
        placeholderReasonCode: null,
        postCard,
      };
      mockBookmarkItems[existingIndex] = updated;
      refreshMockBookmarkCollectionCounts();
      return ok({
        bookmarkItemId: updated.bookmarkItemId,
        bookmarkCollectionId: targetCollectionId,
        action,
        savedAtIso: updated.savedAtIso,
      });
    }
    const created: BookmarkCollectionItemCardView = {
      bookmarkItemId: `bookmark-item-${crypto.randomUUID()}`,
      postId,
      bookmarkCollectionId: targetCollectionId,
      savedAtIso: now,
      itemState: 'ACTIVE',
      placeholderReasonCode: null,
      postCard,
    };
    mockBookmarkItems = [created, ...mockBookmarkItems];
    refreshMockBookmarkCollectionCounts();
    return ok({
      bookmarkItemId: created.bookmarkItemId,
      bookmarkCollectionId: targetCollectionId,
      action: 'ADDED' as const,
      savedAtIso: created.savedAtIso,
    });
  }),
  http.delete('/api/bookmarks/posts/:postId', ({ params }) => {
    const postId = String(params.postId);
    const existing = mockBookmarkItems.find((item) => item.postId === postId) ?? null;
    mockBookmarkItems = mockBookmarkItems.filter((item) => item.postId !== postId);
    refreshMockBookmarkCollectionCounts();
    return ok({
      bookmarkItemId: existing?.bookmarkItemId ?? null,
      bookmarkCollectionId: existing?.bookmarkCollectionId ?? null,
      removed: Boolean(existing),
    });
  }),
  http.post('/api/bookmarks/items/move', async ({ request }) => {
    const body = (await request.json()) as {
      sourceCollectionId?: unknown;
      targetCollectionId?: unknown;
      itemIds?: unknown;
    };
    if (
      typeof body.sourceCollectionId !== 'string' ||
      typeof body.targetCollectionId !== 'string' ||
      !Array.isArray(body.itemIds) ||
      body.itemIds.some((item) => typeof item !== 'string')
    ) {
      return apiError(400, 'BOOKMARK_BATCH_REQUEST_INVALID', '批量移动请求不合法');
    }
    if (
      !findMockBookmarkCollection(body.sourceCollectionId) ||
      !findMockBookmarkCollection(body.targetCollectionId)
    ) {
      return apiError(404, 'BOOKMARK_COLLECTION_NOT_FOUND', '收藏夹不存在');
    }
    const requested = body.itemIds as string[];
    const deduped = [...new Set(requested)];
    const movedItemIds: string[] = [];
    const skippedItemIds: string[] = [];
    for (const itemId of deduped) {
      const index = mockBookmarkItems.findIndex(
        (item) =>
          item.bookmarkItemId === itemId && item.bookmarkCollectionId === body.sourceCollectionId,
      );
      if (index < 0 || body.sourceCollectionId === body.targetCollectionId) {
        skippedItemIds.push(itemId);
        continue;
      }
      const item = mockBookmarkItems[index];
      if (!item) {
        skippedItemIds.push(itemId);
        continue;
      }
      mockBookmarkItems = mockBookmarkItems.filter(
        (candidate) =>
          candidate.bookmarkItemId === item.bookmarkItemId ||
          !(
            candidate.postId === item.postId &&
            candidate.bookmarkCollectionId === body.targetCollectionId
          ),
      );
      const nextIndex = mockBookmarkItems.findIndex(
        (candidate) => candidate.bookmarkItemId === item.bookmarkItemId,
      );
      if (nextIndex < 0) {
        skippedItemIds.push(itemId);
        continue;
      }
      const updated: BookmarkCollectionItemCardView =
        item.itemState === 'ACTIVE'
          ? {
              ...item,
              bookmarkCollectionId: body.targetCollectionId,
              postCard:
                cloneMockPostCardForBookmark(item.postId, body.targetCollectionId) ?? item.postCard,
            }
          : {
              ...item,
              bookmarkCollectionId: body.targetCollectionId,
              postCard: null,
            };
      mockBookmarkItems[nextIndex] = updated;
      movedItemIds.push(itemId);
    }
    refreshMockBookmarkCollectionCounts();
    return ok({
      sourceCollectionId: body.sourceCollectionId,
      targetCollectionId: body.targetCollectionId,
      requestedCount: requested.length,
      dedupedCount: deduped.length,
      processedCount: deduped.length,
      movedCount: movedItemIds.length,
      skippedCount: skippedItemIds.length,
      movedItemIds,
      skippedItemIds,
    });
  }),
  http.post('/api/bookmarks/items/remove', async ({ request }) => {
    const body = (await request.json()) as { itemIds?: unknown };
    if (!Array.isArray(body.itemIds) || body.itemIds.some((item) => typeof item !== 'string')) {
      return apiError(400, 'BOOKMARK_BATCH_REQUEST_INVALID', '批量移除请求不合法');
    }
    const requested = body.itemIds as string[];
    const deduped = [...new Set(requested)];
    const removed = mockBookmarkItems.filter((item) => deduped.includes(item.bookmarkItemId));
    const removedIds = new Set(removed.map((item) => item.bookmarkItemId));
    mockBookmarkItems = mockBookmarkItems.filter((item) => !removedIds.has(item.bookmarkItemId));
    const skippedItemIds = deduped.filter((itemId) => !removedIds.has(itemId));
    refreshMockBookmarkCollectionCounts();
    return ok({
      requestedCount: requested.length,
      dedupedCount: deduped.length,
      processedCount: deduped.length,
      removedCount: removed.length,
      skippedCount: skippedItemIds.length,
      removedItemIds: [...removedIds],
      skippedItemIds,
      removedPostIds: removed.map((item) => item.postId),
    });
  }),
  http.get('/api/me/content-center/published', ({ request }) => {
    const cards = posts.map((post) => {
      const bookmark = mockBookmarkItems.find((item) => item.postId === post.id);
      if (!bookmark) return requiredMockPostCard(post.id);
      return (
        cloneMockPostCardForBookmark(post.id, bookmark.bookmarkCollectionId) ??
        requiredMockPostCard(post.id)
      );
    });
    return ok({
      ...cursorPageView(cards, request),
      degraded: false,
      degradedReasons: [],
      pageMayBeShort: false,
      filteredCountHint: 0,
    });
  }),
  http.get('/api/me/content-center/drafts', ({ request }) =>
    ok(cursorPageView(mockContentCenterDrafts, request)),
  ),
  http.post('/api/me/content-center/drafts/batch-delete', async ({ request }) => {
    const body = (await request.json()) as { draftIds?: unknown };
    if (!Array.isArray(body.draftIds) || body.draftIds.some((item) => typeof item !== 'string')) {
      return apiError(400, 'POST_DRAFT_BATCH_INVALID', '草稿批量删除请求不合法');
    }
    const results = (body.draftIds as string[]).map((draftId) => {
      const exists = mockContentCenterDrafts.some((draft) => draft.draftId === draftId);
      if (!exists) {
        return {
          draftId,
          succeeded: false,
          outcome: null,
          errorCode: 'DRAFT_NOT_FOUND' as const,
          errorMessage: '草稿不存在',
        };
      }
      removeMockDraft(draftId);
      return {
        draftId,
        succeeded: true,
        outcome: 'DELETED_NOW' as const,
        errorCode: null,
        errorMessage: null,
      };
    });
    return ok({ results });
  }),
  http.get('/api/me/content-center/deleted', ({ request }) =>
    ok(cursorPageView(mockDeletedContent, request)),
  ),
  http.post('/api/me/history/posts', async ({ request }) => {
    const body = (await request.json()) as RecordPostBrowseHistoryInput;
    const postCard = mockPostCard(body.postId);
    if (!postCard) return apiError(404, 'POST_NOT_FOUND', 'Post not found');

    const now = new Date().toISOString();
    const existingIndex = mockBrowseHistory.findIndex((item) => item.postId === body.postId);
    const previous = existingIndex >= 0 ? mockBrowseHistory[existingIndex] : null;
    const viewCount = (previous?.viewCount ?? 0) + 1;
    if (existingIndex >= 0) mockBrowseHistory.splice(existingIndex, 1);
    mockBrowseHistory.unshift({
      postId: body.postId,
      lastViewedAtIso: now,
      viewCount,
      sourceScene: body.sourceScene,
      sourceModule: body.sourceModule,
      itemState: 'ACTIVE',
      placeholderReasonCode: null,
      postCard,
    });

    return ok({
      recorded: true,
      deduped: false,
      lastViewedAtTouched: true,
      viewCountIncremented: true,
      lastViewedAtIso: now,
      viewCount,
    });
  }),
  http.get('/api/me/history/posts', ({ request }) =>
    ok(cursorPageView(mockBrowseHistory, request)),
  ),
  http.delete('/api/me/history/posts/:postId', ({ params }) => {
    const postId = String(params.postId);
    const before = mockBrowseHistory.length;
    mockBrowseHistory = mockBrowseHistory.filter((item) => item.postId !== postId);
    return ok({ deleted: mockBrowseHistory.length < before });
  }),
  http.delete('/api/me/history/posts', () => {
    const clearedCount = mockBrowseHistory.length;
    mockBrowseHistory = [];
    return ok({ clearedCount });
  }),
  http.post('/api/posts/:postId/reposts', ({ params, request }) => {
    if (!request.headers.get('idempotency-key')) {
      return apiError(400, 'POST_IDEMPOTENCY_KEY_REQUIRED', '缺少 Idempotency-Key');
    }
    const sourcePostId = String(params.postId);
    if (!mockPostCard(sourcePostId)) return apiError(404, 'POST_NOT_FOUND', '帖子不存在');
    const noOp = mockRepostedPostIds.has(sourcePostId);
    mockRepostedPostIds.add(sourcePostId);
    return ok({
      repostId: `repost-relation-${sourcePostId}`,
      repostPostId: `repost-post-${sourcePostId}`,
      sourcePostId,
      reposted: true as const,
      noOp,
    });
  }),
  http.delete('/api/posts/:postId/reposts', ({ params }) => {
    const sourcePostId = String(params.postId);
    const existed = mockRepostedPostIds.delete(sourcePostId);
    return ok({
      repostId: existed ? `repost-relation-${sourcePostId}` : null,
      sourcePostId,
      canceled: true as const,
      noOp: !existed,
    });
  }),
  http.get('/api/notifications', ({ request }) => {
    const url = new URL(request.url);
    const tab = url.searchParams.get('tab') ?? 'ALL';
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const list = mockNotifications.filter((item) => {
      if (unreadOnly && item.readAt) return false;
      if (tab === 'MENTIONS') return item.category === 'MENTION';
      if (tab === 'INTERACTIONS') return item.category === 'INTERACTION';
      if (tab === 'COMMUNITIES') return item.category === 'COMMUNITY';
      if (tab === 'SYSTEM') return item.category === 'SYSTEM';
      return true;
    });
    return ok({
      list,
      nextCursor: null,
      hasMore: false,
      degraded: false,
      degradedReason: null,
    });
  }),
  http.get('/api/notifications/unread-summary', () => ok(calculateUnreadSummary())),
  http.post('/api/notifications/read', async ({ request }) => {
    const body = (await request.json()) as { notificationIds: string[] };
    const readAt = new Date().toISOString();
    let updatedCount = 0;
    mockNotifications = mockNotifications.map((item) => {
      if (!body.notificationIds.includes(item.notificationId) || item.readAt) return item;
      updatedCount += 1;
      return { ...item, readAt };
    });
    return ok({ updatedCount, lastReadAt: readAt });
  }),
  http.post('/api/notifications/read-all', () => {
    const readAt = new Date().toISOString();
    let updatedCount = 0;
    mockNotifications = mockNotifications.map((item) => {
      if (item.readAt) return item;
      updatedCount += 1;
      return { ...item, readAt };
    });
    return ok({ updatedCount, lastReadAt: readAt });
  }),
  http.get('/api/notifications/realtime/bootstrap', () =>
    ok({ summary: calculateUnreadSummary(), latestSeq: mockNotifications[0]?.streamSeq ?? '0' }),
  ),
  http.get('/api/notifications/delta', ({ request }) => {
    const afterSeq = new URL(request.url).searchParams.get('afterSeq') ?? '0';
    const list = mockNotifications.filter((item) => Number(item.streamSeq) > Number(afterSeq));
    return ok({
      list,
      latestSeq: mockNotifications[0]?.streamSeq ?? afterSeq,
      hasGap: false,
    });
  }),
  http.get('/api/notifications/:notificationId/target', ({ params }) => {
    const item = mockNotifications.find(
      (candidate) => candidate.notificationId === String(params.notificationId),
    );
    const available = Boolean(item?.entity?.actionUrl);
    return ok({
      notificationId: String(params.notificationId),
      targetState: available ? ('ALLOW' as const) : ('MASKED' as const),
      entityType: available ? (item?.entity?.entityType ?? null) : null,
      entityId: available ? (item?.entity?.entityId ?? null) : null,
      targetPostId: null,
      commentId: null,
      actionUrl: item?.entity?.actionUrl ?? null,
      maskedReasonCode: available ? null : 'TARGET_PERMISSION_DENIED',
    });
  }),
  http.get('/api/settings/overview', () =>
    ok({
      profile: {
        userId: currentUser.id,
        handle: mockHandle,
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
        coverUrl: currentUser.coverUrl,
        bio: currentUser.bio,
        location: currentUser.location,
        websiteUrl: currentUser.website,
        updatedAt: '2026-08-09T01:00:00.000Z',
      },
      account: {
        status: 'ACTIVE' as const,
        activeSessionCount: mockSessions.length,
      },
      privacy: {
        accountVisibility: mockPermissionPolicy.accountVisibility,
        allowSearchIndex: mockPermissionPolicy.allowSearchIndex,
        defaultPostVisibility: mockPermissionPolicy.defaultPostVisibility,
        defaultCommentPermission: mockPermissionPolicy.defaultCommentPermission,
        defaultQuotePermission: mockPermissionPolicy.defaultQuotePermission,
        mentionPermission: mockPermissionPolicy.mentionPermission,
      },
      notification: {
        userId: mockNotificationSettings.userId,
        rowExists: mockNotificationSettings.rowExists,
        source: mockNotificationSettings.source,
        inAppChannelEnabled: mockNotificationSettings.inAppChannelEnabled,
        emailChannelEnabled: mockNotificationSettings.emailChannelEnabled,
        smsChannelEnabled: mockNotificationSettings.smsChannelEnabled,
        communityNotificationEnabled: mockNotificationSettings.communityNotificationEnabled,
        quietHoursEnabled: mockNotificationSettings.quietHoursEnabled,
        notificationPreferenceVersion: mockNotificationSettings.notificationPreferenceVersion,
      },
      search: mockSearchSettings,
      recommendation: {
        userId: mockRecommendationSettings.userId,
        localeCode: mockRecommendationSettings.localeCode,
        regionCode: mockRecommendationSettings.regionCode,
        allowPersonalizedRecommendation: mockRecommendationSettings.allowPersonalizedRecommendation,
        allowCrossLanguageRecommendation:
          mockRecommendationSettings.allowCrossLanguageRecommendation,
        allowCommunityRecommendation: mockRecommendationSettings.allowCommunityRecommendation,
        interestTagCount: mockRecommendationSettings.interestTagCodes.length,
        recommendationPreferenceVersion: mockRecommendationSettings.recommendationPreferenceVersion,
      },
    }),
  ),
  http.get('/api/settings/notifications', () => ok(mockNotificationSettings)),
  http.patch('/api/settings/notifications', async ({ request }) => {
    const patch = (await request.json()) as Partial<typeof mockNotificationSettings>;
    mockNotificationSettings = {
      ...mockNotificationSettings,
      ...patch,
      userId: currentUser.id,
      rowExists: true,
      source: 'PERSISTED',
      notificationPreferenceVersion: mockNotificationSettings.notificationPreferenceVersion + 1,
    };
    return ok(mockNotificationSettings);
  }),
  http.get('/api/settings/recommendation', () => ok(mockRecommendationSettings)),
  http.patch('/api/settings/recommendation', async ({ request }) => {
    const patch = (await request.json()) as Partial<typeof mockRecommendationSettings>;
    mockRecommendationSettings = {
      ...mockRecommendationSettings,
      ...patch,
      userId: currentUser.id,
      interestTagCodes: mockRecommendationSettings.interestTagCodes,
      recommendationPreferenceVersion:
        mockRecommendationSettings.recommendationPreferenceVersion + 1,
    };
    mockSearchSettings = {
      ...mockSearchSettings,
      localeCode: mockRecommendationSettings.localeCode,
      regionCode: mockRecommendationSettings.regionCode,
    };
    return ok(mockRecommendationSettings);
  }),
  http.get('/api/settings/search', () => ok(mockSearchSettings)),
  http.patch('/api/settings/search', async ({ request }) => {
    const patch = (await request.json()) as Partial<typeof mockSearchSettings>;
    mockSearchSettings = {
      ...mockSearchSettings,
      ...patch,
      userId: currentUser.id,
      localeCode: mockRecommendationSettings.localeCode,
      regionCode: mockRecommendationSettings.regionCode,
      searchPreferenceVersion: mockSearchSettings.searchPreferenceVersion + 1,
    };
    return ok(mockSearchSettings);
  }),
  http.get('/api/settings/interests/catalog', () =>
    ok({
      dictionaryVersion: 'mock-interest-catalog-v1',
      items: mockInterestTagCatalog,
      allowedInterestTagCodes: mockInterestTagCatalog.map((item) => item.interestTagCode),
    }),
  ),
  http.get('/api/settings/interests', () =>
    ok({ list: mockInterestTagCodes.map((interestTagCode) => ({ interestTagCode })) }),
  ),
  http.put('/api/settings/interests', async ({ request }) => {
    const body = (await request.json()) as { items: Array<{ interestTagCode: string }> };
    mockInterestTagCodes = body.items.map((item) => item.interestTagCode);
    mockRecommendationSettings = {
      ...mockRecommendationSettings,
      interestTagCodes: [...mockInterestTagCodes],
      recommendationPreferenceVersion:
        mockRecommendationSettings.recommendationPreferenceVersion + 1,
    };
    return ok({ list: mockInterestTagCodes.map((interestTagCode) => ({ interestTagCode })) });
  }),
  http.get('/api/permissions/me/policy', () => ok(mockPermissionPolicy)),
  http.patch('/api/permissions/me/policy', async ({ request }) => {
    const patch = (await request.json()) as Partial<typeof mockPermissionPolicy>;
    mockPermissionPolicy = { ...mockPermissionPolicy, ...patch };
    return ok({ snapshot: mockPermissionPolicy });
  }),
  http.post('/api/permissions/me/policy/preview', async ({ request }) => {
    const patch = (await request.json()) as Partial<typeof mockPermissionPolicy>;
    return ok({ previewPolicy: { ...mockPermissionPolicy, ...patch } });
  }),
];
