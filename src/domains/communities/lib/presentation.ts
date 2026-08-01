import { buildLabeledOptions, type LabeledOption } from '@/shared/model/options';
import {
  COMMUNITY_COMMENT_ROLES,
  COMMUNITY_JOIN_POLICIES,
  COMMUNITY_OVERVIEW_WINDOWS,
  COMMUNITY_POST_ROLES,
  COMMUNITY_VISIBILITIES,
  type CommunityAssignableMemberRole,
  type CommunityCommentRole,
  type CommunityJoinPolicy,
  type CommunityJoinRequestStatus,
  type CommunityMemberRole,
  type CommunityModerationActionType,
  type CommunityOverviewWindowDays,
  type CommunityPostRole,
  type CommunityVisibility,
} from '../model/types';

export const COMMUNITY_VISIBILITY_LABELS: Readonly<Record<CommunityVisibility, string>> = {
  PUBLIC: '公开社群',
  PRIVATE: '私密社群',
};

export const COMMUNITY_JOIN_POLICY_LABELS: Readonly<Record<CommunityJoinPolicy, string>> = {
  OPEN: '开放加入',
  APPROVAL: '需要管理员审批',
  INVITE_ONLY: '仅限邀请',
};

export const COMMUNITY_MEMBER_ROLE_LABELS: Readonly<Record<CommunityMemberRole, string>> = {
  MEMBER: '成员',
  MODERATOR: '版主',
  ADMIN: '管理员',
  OWNER: '所有者',
};

export const COMMUNITY_POST_ROLE_MIN_LABELS: Readonly<Record<CommunityPostRole, string>> = {
  MEMBER: '成员及以上',
  MODERATOR: '版主及以上',
  ADMIN: '管理员及以上',
  OWNER: '仅所有者',
};

export const COMMUNITY_COMMENT_ROLE_MIN_LABELS: Readonly<Record<CommunityCommentRole, string>> = {
  VISITOR: '所有可见用户',
  ...COMMUNITY_POST_ROLE_MIN_LABELS,
};

export const COMMUNITY_OVERVIEW_WINDOW_LABELS: Readonly<
  Record<CommunityOverviewWindowDays, string>
> = {
  7: '最近 7 天',
  14: '最近 14 天',
  30: '最近 30 天',
};

export const COMMUNITY_JOIN_REQUEST_STATUS_LABELS: Readonly<
  Record<CommunityJoinRequestStatus, string>
> = {
  PENDING: '待审批',
  APPROVED: '已批准',
  REJECTED: '已拒绝',
  CANCELLED: '已取消',
  EXPIRED: '已过期',
};

export const COMMUNITY_MODERATION_ACTION_LABELS: Readonly<
  Record<CommunityModerationActionType, string>
> = {
  COMMUNITY_CREATED: '创建社群',
  COMMUNITY_PROFILE_UPDATED: '更新社群资料',
  COMMUNITY_RULES_UPDATED: '更新社群规则',
  COMMUNITY_SETTINGS_UPDATED: '更新社群设置',
  COMMUNITY_JOIN_REQUEST_CREATED: '提交加入申请',
  COMMUNITY_JOIN_REQUEST_APPROVED: '批准加入申请',
  COMMUNITY_JOIN_REQUEST_REJECTED: '拒绝加入申请',
  COMMUNITY_MEMBER_JOINED: '成员加入社群',
  COMMUNITY_MEMBER_LEFT: '成员退出社群',
  COMMUNITY_MEMBER_REMOVED: '移除社群成员',
  COMMUNITY_MEMBER_ROLE_CHANGED: '调整成员角色',
  COMMUNITY_POST_PINNED: '置顶帖子',
  COMMUNITY_POST_UNPINNED: '取消置顶',
  COMMUNITY_POST_DELETED: '删除社群帖子',
  COMMUNITY_POST_DETACHED: '将帖子移出社群',
  COMMUNITY_PINNED_POST_REORDERED: '调整置顶顺序',
  COMMUNITY_DELETED: '删除社群',
};

export const COMMUNITY_VISIBILITY_OPTIONS = buildLabeledOptions(
  COMMUNITY_VISIBILITIES,
  COMMUNITY_VISIBILITY_LABELS,
);
export const COMMUNITY_JOIN_POLICY_OPTIONS = buildLabeledOptions(
  COMMUNITY_JOIN_POLICIES,
  COMMUNITY_JOIN_POLICY_LABELS,
);
export const COMMUNITY_MEMBER_ROLE_OPTIONS = buildLabeledOptions(
  COMMUNITY_POST_ROLES,
  COMMUNITY_MEMBER_ROLE_LABELS,
);
export const COMMUNITY_POST_ROLE_MIN_OPTIONS = buildLabeledOptions(
  COMMUNITY_POST_ROLES,
  COMMUNITY_POST_ROLE_MIN_LABELS,
);
export const COMMUNITY_COMMENT_ROLE_MIN_OPTIONS = buildLabeledOptions(
  COMMUNITY_COMMENT_ROLES,
  COMMUNITY_COMMENT_ROLE_MIN_LABELS,
);
export const COMMUNITY_OVERVIEW_WINDOW_OPTIONS = buildLabeledOptions(
  COMMUNITY_OVERVIEW_WINDOWS,
  COMMUNITY_OVERVIEW_WINDOW_LABELS,
);

export const COMMUNITY_ASSIGNABLE_MEMBER_ROLE_OPTIONS = COMMUNITY_MEMBER_ROLE_OPTIONS.filter(
  (option): option is LabeledOption<CommunityAssignableMemberRole> => option.value !== 'OWNER',
);
