import type { PostCardBriefView } from '@/domains/posts/model/types';
import type { UserRelationSnapshotView } from '@/domains/users/model/types';
import type { PublicPrivateVisibility } from '@/shared/model/visibility';

/**
 * Legacy display model used by the existing discovery cards. The management
 * workspace uses the canonical B08 view types below and must not infer
 * management facts from this compact shape.
 */
export interface CommunitySummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  membersCount: number;
  joined?: boolean;
}

/** Legacy detail adapter retained for the public community page. */
export interface CommunityDetail extends CommunitySummary {
  coverUrl: string | null;
  rules: string[];
  visibility: PublicPrivateVisibility;
  joinMode: 'open' | 'approval';
}

export const COMMUNITY_MAX_TAG_COUNT = 10;
export const COMMUNITY_MAX_TAG_LENGTH = 24;
export const COMMUNITY_MAX_RULE_COUNT = 10;
export const COMMUNITY_MAX_RULE_LENGTH = 500;

export const COMMUNITY_STATUSES = ['ACTIVE', 'ARCHIVED', 'DELETED'] as const;
export type CommunityStatus = (typeof COMMUNITY_STATUSES)[number];

export const COMMUNITY_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;
export type CommunityVisibility = (typeof COMMUNITY_VISIBILITIES)[number];

export const COMMUNITY_JOIN_POLICIES = ['OPEN', 'APPROVAL', 'INVITE_ONLY'] as const;
export type CommunityJoinPolicy = (typeof COMMUNITY_JOIN_POLICIES)[number];

export const COMMUNITY_POST_ROLES = ['MEMBER', 'MODERATOR', 'ADMIN', 'OWNER'] as const;
export type CommunityPostRole = (typeof COMMUNITY_POST_ROLES)[number];
export type CommunityMemberRole = CommunityPostRole;
export type CommunityAssignableMemberRole = Exclude<CommunityMemberRole, 'OWNER'>;
export type CommunityManagerRole = Exclude<CommunityMemberRole, 'MEMBER'>;

export const COMMUNITY_OVERVIEW_WINDOWS = [7, 14, 30] as const;
export type CommunityOverviewWindowDays = (typeof COMMUNITY_OVERVIEW_WINDOWS)[number];

export const COMMUNITY_COMMENT_ROLES = ['VISITOR', ...COMMUNITY_POST_ROLES] as const;
export type CommunityCommentRole = (typeof COMMUNITY_COMMENT_ROLES)[number];
export type CommunityPermissionRole = CommunityCommentRole;
export type CommunityMembershipStatusView =
  'NONE' | 'PENDING' | 'ACTIVE' | 'LEFT' | 'REMOVED' | 'BANNED';
export type CommunityJoinRequestStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export type CommunityPinType = 'NORMAL' | 'ANNOUNCEMENT';

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserPublicCardView {
  userId: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  followersCount: number;
  profileVersion: number | null;
  source: 'PROJECTION' | 'PG_FALLBACK';
  freshness: 'VERSIONED' | 'BEST_EFFORT';
  relationship: UserRelationSnapshotView | null;
}

export type UserManagementOwnerBasePlaceholderReason =
  | 'USER_NOT_FOUND'
  | 'ACCOUNT_DISABLED'
  | 'USER_STATUS_NOT_ACTIVE'
  | 'HANDLE_MISSING'
  | 'PROFILE_FACTS_UNAVAILABLE';

export type UserManagementOwnerBaseEntryView =
  | {
      userId: string;
      handle: string;
      displayName: string;
      bio: string | null;
      avatarUrl: string | null;
      relationship: UserRelationSnapshotView;
      cardState: 'FULL';
      placeholderReason: null;
    }
  | {
      userId: string;
      handle: string;
      displayName: null;
      bio: null;
      avatarUrl: null;
      relationship: null;
      cardState: 'PLACEHOLDER';
      placeholderReason: 'PROFILE_FACTS_UNAVAILABLE';
    }
  | {
      userId: string;
      handle: null;
      displayName: null;
      bio: null;
      avatarUrl: null;
      relationship: null;
      cardState: 'PLACEHOLDER';
      placeholderReason: Exclude<
        UserManagementOwnerBasePlaceholderReason,
        'PROFILE_FACTS_UNAVAILABLE'
      >;
    };

export interface CommunityCardBriefView {
  communityId: string;
  slug: string;
  name: string;
  description: string | null;
  avatarKey: string | null;
  avatarUrl: string | null;
  coverKey: string | null;
  coverUrl: string | null;
  categoryKey: string | null;
  tags: string[];
  status: CommunityStatus;
  visibility: CommunityVisibility;
  joinPolicy: CommunityJoinPolicy;
  memberCount: number;
  postCount: number;
  pinnedPostCount: number;
  ownerUserId: string;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface CommunityPolicyBaseView {
  communityId: string;
  status: CommunityStatus;
  visibility: CommunityVisibility;
  joinPolicy: CommunityJoinPolicy;
  postRoleMin: CommunityPostRole;
  commentRoleMin: CommunityCommentRole;
  quoteEnabled: boolean;
  repostEnabled: boolean;
  requireRuleAcceptanceBeforePost: boolean;
  rulesVersion: number;
  settingsVersion: number;
}

export interface CommunityPermissionContextView extends CommunityPolicyBaseView {
  actorMembershipStatus: CommunityMembershipStatusView;
  actorRole: CommunityPermissionRole;
  actorHasAcceptedCurrentRules: boolean;
  canViewCommunity: boolean;
  canManageCommunity: boolean;
  canReviewJoinRequests: boolean;
  canPinPost: boolean;
  canPublishPost: boolean;
}

export type CommunityManagerItemView =
  | {
      state: 'READY';
      userId: string;
      role: CommunityManagerRole;
      userCard: UserPublicCardView;
    }
  | {
      state: 'MASKED';
      role: CommunityManagerRole;
    }
  | {
      state: 'TEMP_UNAVAILABLE';
      role: CommunityManagerRole;
    };

export interface CommunityDetailView {
  community: CommunityCardBriefView & {
    postRoleMin: CommunityPostRole;
    commentRoleMin: CommunityCommentRole;
    quoteEnabled: boolean;
    repostEnabled: boolean;
    requireRuleAcceptanceBeforePost: boolean;
    rulesVersion: number;
    settingsVersion: number;
  };
  rules: Array<{
    sortOrder: number;
    content: string;
  }>;
  managers: CommunityManagerItemView[];
  pinnedPosts: PostCardBriefView[];
  viewerContext: CommunityPermissionContextView | null;
}

export interface CommunityMemberListItemView {
  userId: string;
  role: CommunityMemberRole;
  joinedAtIso: string;
  userCard: UserPublicCardView;
}

export interface CommunityJoinRequestListItemView {
  joinRequestId: string;
  applicantUserId: string;
  status: CommunityJoinRequestStatus;
  requestMessage: string | null;
  decisionMessage: string | null;
  createdAtIso: string;
  reviewedAtIso: string | null;
  applicantEntry: UserManagementOwnerBaseEntryView;
}

export interface CommunityManagementOverviewSnapshotView {
  communityId: string;
  memberCount: number;
  pendingJoinRequestCount: number;
  postCount: number;
  pinnedPostCount: number;
  activeManagerCount: number;
  lastPostAtIso: string | null;
  visibility: CommunityVisibility;
  joinPolicy: CommunityJoinPolicy;
  postRoleMin: CommunityPostRole;
  commentRoleMin: CommunityCommentRole;
}

export interface CommunityManagementOverviewDailyItemView {
  date: string;
  newMemberCount: number;
  newJoinRequestCount: number;
  newPostCount: number;
}

export interface CommunityManagementOverviewView {
  snapshot: CommunityManagementOverviewSnapshotView;
  daily: CommunityManagementOverviewDailyItemView[];
}

export const COMMUNITY_MODERATION_ACTION_TYPES = [
  'COMMUNITY_CREATED',
  'COMMUNITY_PROFILE_UPDATED',
  'COMMUNITY_RULES_UPDATED',
  'COMMUNITY_SETTINGS_UPDATED',
  'COMMUNITY_JOIN_REQUEST_CREATED',
  'COMMUNITY_JOIN_REQUEST_APPROVED',
  'COMMUNITY_JOIN_REQUEST_REJECTED',
  'COMMUNITY_MEMBER_JOINED',
  'COMMUNITY_MEMBER_LEFT',
  'COMMUNITY_MEMBER_REMOVED',
  'COMMUNITY_MEMBER_ROLE_CHANGED',
  'COMMUNITY_POST_PINNED',
  'COMMUNITY_POST_UNPINNED',
  'COMMUNITY_POST_DELETED',
  'COMMUNITY_POST_DETACHED',
  'COMMUNITY_PINNED_POST_REORDERED',
  'COMMUNITY_DELETED',
] as const;

export type CommunityModerationActionType = (typeof COMMUNITY_MODERATION_ACTION_TYPES)[number];

export type CommunityMembershipStatusRecord = 'ACTIVE' | 'LEFT' | 'REMOVED' | 'BANNED';

export interface CommunityProfileSnapshot {
  slug: string;
  name: string;
  description: string | null;
  avatarKey: string | null;
  coverKey: string | null;
  categoryKey: string | null;
  tags: string[];
  locale: string | null;
  regionCode: string | null;
}

export interface CommunitySettingsSnapshot {
  visibility: CommunityVisibility;
  joinPolicy: CommunityJoinPolicy;
  postRoleMin: CommunityPostRole;
  commentRoleMin: CommunityCommentRole;
  quoteEnabled: boolean;
  repostEnabled: boolean;
  requireRuleAcceptanceBeforePost: boolean;
  settingsVersion: number;
}

export type UpdateCommunityProfileField = keyof CommunityProfileSnapshot;
export type UpdateCommunitySettingsField =
  | 'visibility'
  | 'joinPolicy'
  | 'postRoleMin'
  | 'commentRoleMin'
  | 'quoteEnabled'
  | 'repostEnabled'
  | 'requireRuleAcceptanceBeforePost';

export type CommunityModerationMetadata =
  | {
      kind: 'COMMUNITY_CREATED';
      profile: CommunityProfileSnapshot;
      settings: CommunitySettingsSnapshot;
      ruleCount: number;
      ownerUserId: string;
    }
  | {
      kind: 'COMMUNITY_PROFILE_UPDATED';
      before: CommunityProfileSnapshot;
      after: CommunityProfileSnapshot;
      updatedFields: UpdateCommunityProfileField[];
    }
  | {
      kind: 'COMMUNITY_RULES_UPDATED';
      previousRulesVersion: number;
      nextRulesVersion: number;
      previousRules: string[];
      nextRules: string[];
    }
  | {
      kind: 'COMMUNITY_SETTINGS_UPDATED';
      before: CommunitySettingsSnapshot;
      after: CommunitySettingsSnapshot;
      updatedFields: UpdateCommunitySettingsField[];
    }
  | {
      kind: 'COMMUNITY_JOIN_REQUEST_CREATED';
      applicantUserId: string;
      requestMessage: string | null;
    }
  | {
      kind: 'COMMUNITY_JOIN_REQUEST_REVIEWED';
      joinRequestId: string;
      applicantUserId: string;
      reviewResult: 'APPROVED' | 'REJECTED';
      decisionMessage: string | null;
      reviewReasonCode: 'APPLICANT_BANNED' | null;
      occurredAtIso: string;
    }
  | {
      kind: 'COMMUNITY_MEMBER_CHANGED';
      targetUserId: string;
      changeKind: 'JOINED' | 'LEFT' | 'REMOVED';
      previousStatus: CommunityMembershipStatusRecord | null;
      nextStatus: CommunityMembershipStatusRecord | null;
    }
  | {
      kind: 'COMMUNITY_ROLE_CHANGED';
      targetUserId: string;
      previousRole: CommunityAssignableMemberRole;
      nextRole: CommunityAssignableMemberRole;
      reason: string | null;
    }
  | {
      kind: 'COMMUNITY_PINNED_POST_CHANGED';
      postId: string;
      pinType: CommunityPinType;
      sortOrder: number;
      action: 'PINNED' | 'UNPINNED';
      reason: string | null;
      occurredAtIso: string;
    }
  | {
      kind: 'COMMUNITY_PINNED_POST_REORDERED';
      postId: string;
      pinType: CommunityPinType;
      fromSortOrder: number;
      toSortOrder: number;
      swappedWithPostId: string | null;
      occurredAtIso: string;
    }
  | {
      kind: 'COMMUNITY_POST_DELETED';
      postId: string;
      communityId: string;
      deletedAtIso: string;
      deleteReason: 'COMMENT_DELETED' | 'QUOTE_DELETED' | 'REPOST_CANCELED' | 'AUTHOR_DELETE';
    }
  | {
      kind: 'COMMUNITY_POST_DETACHED';
      postId: string;
      previousCommunityId: string;
      detachedAtIso: string;
    }
  | {
      kind: 'COMMUNITY_DELETED';
      previousStatus: 'ACTIVE' | 'ARCHIVED';
      deletedAtIso: string;
      cancelledJoinRequestCount: number;
      removedMembershipCount: number;
      deletedPinnedCount: number;
    };

export interface CommunityModerationLogItemView {
  logId: string;
  actionType: CommunityModerationActionType;
  actorUserId: string;
  targetUserId: string | null;
  postId: string | null;
  joinRequestId: string | null;
  reason: string | null;
  metadata: CommunityModerationMetadata | null;
  actorUser: UserPublicCardView | null;
  targetUser: UserPublicCardView | null;
  createdAtIso: string;
}

export type CommunityPinnedPostsDegradedReason =
  | 'STALE_PINNED_ROW'
  | 'PERMISSION_FILTERED'
  | 'OWNER_BASE_MISSING'
  | 'PINNED_COUNT_DRIFT'
  | 'DEPENDENCY_UNAVAILABLE';

export interface CommunityPinnedPostListItemView {
  postId: string;
  pinType: CommunityPinType;
  sortOrder: number;
  pinnedByUserId: string;
  pinnedAtIso: string;
  postCard: PostCardBriefView;
}

export interface CommunityPinnedPostsView {
  list: CommunityPinnedPostListItemView[];
  degraded: boolean;
  degradedReason: CommunityPinnedPostsDegradedReason | null;
  filteredCountHint: number | null;
}

export interface CreateCommunityInput {
  slug: string;
  name: string;
  description?: string | null;
  avatarKey?: string | null;
  coverKey?: string | null;
  categoryKey?: string | null;
  tags?: string[];
  locale?: string | null;
  regionCode?: string | null;
  joinPolicy?: CommunityJoinPolicy;
  postRoleMin?: CommunityPostRole;
  commentRoleMin?: CommunityCommentRole;
  quoteEnabled?: boolean;
  repostEnabled?: boolean;
  requireRuleAcceptanceBeforePost?: boolean;
  rules?: string[];
}

export interface CreateCommunityResult {
  communityId: string;
  slug: string;
  ownerUserId: string;
  rulesVersion: number;
  settingsVersion: number;
}

export interface UpdateCommunitySettingsInput {
  visibility?: CommunityVisibility;
  joinPolicy?: CommunityJoinPolicy;
  postRoleMin?: CommunityPostRole;
  commentRoleMin?: CommunityCommentRole;
  quoteEnabled?: boolean;
  repostEnabled?: boolean;
  requireRuleAcceptanceBeforePost?: boolean;
}

export interface UpdateCommunitySettingsResult {
  communityId: string;
  settingsVersion: number;
  updatedAtIso: string;
}

export interface UpdateCommunityRulesResult {
  communityId: string;
  rulesVersion: number;
  ruleCount: number;
  updatedAtIso: string;
}

export type ApproveCommunityJoinRequestResult =
  | 'APPROVED_AND_MEMBERSHIP_ACTIVATED'
  | 'APPROVED_REQUEST_ALREADY_ACTIVE_MEMBER'
  | 'REJECTED_AS_INELIGIBLE'
  | 'ALREADY_APPROVED_NOOP';

export interface ApproveCommunityJoinRequestResponse {
  communityId: string;
  joinRequestId: string;
  applicantUserId: string;
  result: ApproveCommunityJoinRequestResult;
}

export interface RejectCommunityJoinRequestResponse {
  communityId: string;
  joinRequestId: string;
  applicantUserId: string;
  result: 'REJECTED' | 'ALREADY_REJECTED_NOOP';
}

export interface ChangeCommunityMemberRoleResponse {
  communityId: string;
  targetUserId: string;
  previousRole: CommunityAssignableMemberRole;
  nextRole: CommunityAssignableMemberRole;
  result: 'CHANGED' | 'NO_CHANGE';
}

export interface RemoveCommunityMemberResponse {
  communityId: string;
  targetUserId: string;
  result: 'REMOVED' | 'ALREADY_REMOVED';
}

export interface PinCommunityPostResponse {
  communityId: string;
  postId: string;
  pinType: CommunityPinType;
  sortOrder: number;
  result: 'PINNED' | 'ALREADY_PINNED';
}

export interface ReorderCommunityPinnedPostResponse {
  communityId: string;
  postId: string;
  sortOrder: number;
  swappedWithPostId: string | null;
}

export interface UnpinCommunityPostResponse {
  communityId: string;
  postId: string;
  result: 'UNPINNED' | 'ALREADY_UNPINNED';
}
