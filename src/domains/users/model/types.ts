import type { CursorPageView } from '@/shared/api/pagination';
import type { ResolvedMediaState } from '@/shared/model/media';
import type { UserIdentityBriefView } from '@/shared/model/userIdentity';

export type CurrentUserCardView = UserIdentityBriefView;

export interface UserSummary {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

/**
 * 认证态与部分推荐/搜索卡片使用的本地展示模型。公开个人主页接口请使用
 * UserProfileHeaderView，避免把前端推测字段当成服务端合同。
 */
export interface UserProfile extends UserSummary {
  coverUrl: string | null;
  location?: string;
  website?: string;
  joinedAt: string;
  postsCount: number;
}

export interface UserProfileEditableView {
  userId: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  birthday: string | null;
  avatarStorageKey: string | null;
  coverStorageKey: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  avatarMediaState: ResolvedMediaState;
  coverMediaState: ResolvedMediaState;
  updatedAt: string;
}

export type UserRelationSummary =
  | 'SELF'
  | 'NONE'
  | 'FOLLOWING'
  | 'FOLLOWED_BY'
  | 'MUTUAL'
  | 'REQUESTED_OUTGOING'
  | 'REQUESTED_INCOMING'
  | 'BLOCKED_BY_VIEWER'
  | 'BLOCKED_BY_TARGET';

export interface UserMuteFlagsView {
  mutePosts: boolean;
  muteNotifications: boolean;
}

export interface UserRelationSnapshotView extends UserMuteFlagsView {
  viewerUserId: string | null;
  targetUserId: string;
  isSelf: boolean;
  following: boolean;
  followedBy: boolean;
  outgoingFollowRequestPending: boolean;
  incomingFollowRequestPending: boolean;
  blockedByViewer: boolean;
  blockedByTarget: boolean;
  summary: UserRelationSummary;
}

export interface UserProfileHeaderView {
  userId: string;
  handle: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  birthday: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  stats: {
    followersCount: number;
    followingCount: number;
  };
  pinnedPostIds: string[];
  relationship: UserRelationSnapshotView | null;
  profileVersion: number;
}

export interface UserListItemView {
  userId: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  relationship: UserRelationSnapshotView | null;
  followedAt: string | null;
  followRequestId: string | null;
  muted: UserMuteFlagsView | null;
  blocked: boolean;
}

export type UserManagementCardState = 'FULL' | 'PLACEHOLDER';

export type UserManagementPlaceholderReason =
  | 'USER_NOT_FOUND'
  | 'HANDLE_MISSING'
  | 'PROFILE_FACTS_UNAVAILABLE'
  | 'VISIBILITY_DENIED'
  | 'USER_STATUS_NOT_ACTIVE'
  | 'ACCOUNT_DISABLED'
  | 'ENTRY_HIDDEN_BY_POLICY'
  | 'MODERATION_RESTRICTED'
  | 'MEMBERSHIP_CONTEXT_UNAVAILABLE'
  | 'SELF_ONLY_SCOPE';

export interface UserManagementListItemView {
  userId: string;
  handle: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  relationship: UserRelationSnapshotView | null;
  cardState: UserManagementCardState;
  placeholderReason: UserManagementPlaceholderReason | null;
  followedAt: string | null;
  followRequestId: string | null;
  muted: UserMuteFlagsView | null;
  blocked: boolean;
}

export interface BlockedUserManagementListItemView extends UserManagementListItemView {
  canUnblock: boolean;
}

export type UserManagementCursorPage = CursorPageView<UserManagementListItemView>;

export type FollowUserActionResult =
  'FOLLOWED' | 'REQUEST_SUBMITTED' | 'ALREADY_FOLLOWING' | 'ALREADY_REQUESTED';
export type UnfollowUserActionResult = 'UNFOLLOWED' | 'NOOP_NOT_FOLLOWING';
export type CancelFollowRequestActionResult = 'CANCELED' | 'NOOP_NOT_PENDING';
export type UpsertUserMuteActionResult =
  'CREATED' | 'UPDATED' | 'NOOP_SAME_FLAGS' | 'CANCELED_BY_FALSE_FLAGS';
export type DeleteUserRelationActionResult = 'DELETED' | 'NOOP_NOT_FOUND';
export type BlockUserActionResult = 'CREATED' | 'ALREADY_BLOCKED' | 'REPAIRED_EXISTING_BLOCK';

export type RelationshipWriteActionResultView<TActionResult extends string> =
  | {
      targetUserId: string;
      actionResult: TActionResult;
      targetState: 'FOUND';
      relationship: UserRelationSnapshotView;
    }
  | {
      targetUserId: string;
      actionResult: TActionResult;
      targetState: 'TARGET_NOT_FOUND';
      relationship: null;
    };

export type FollowUserResult = RelationshipWriteActionResultView<FollowUserActionResult>;
export type UnfollowUserResult = RelationshipWriteActionResultView<UnfollowUserActionResult>;
export type CancelFollowRequestResult =
  RelationshipWriteActionResultView<CancelFollowRequestActionResult>;
export type UserFollowRelationshipWriteResult =
  FollowUserResult | UnfollowUserResult | CancelFollowRequestResult;
export type UpsertUserMuteResult = RelationshipWriteActionResultView<UpsertUserMuteActionResult>;
export type DeleteUserRelationResult =
  RelationshipWriteActionResultView<DeleteUserRelationActionResult>;
export type BlockUserResult = RelationshipWriteActionResultView<BlockUserActionResult>;

export interface ApproveFollowRequestResult {
  followRequestId: string;
  requesterUserId: string;
  targetUserId: string;
  targetState: 'FOUND' | 'TARGET_NOT_FOUND';
  relationship: UserRelationSnapshotView | null;
}

export interface RejectFollowRequestResult {
  followRequestId: string;
  requesterUserId: string;
  targetUserId: string;
  rejected: true;
}

export type FollowRequestReviewResult = ApproveFollowRequestResult | RejectFollowRequestResult;
