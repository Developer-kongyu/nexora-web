import type {
  BookmarkCollectionVisibility,
  BookmarkPlaceholderReasonCode,
  BrowseHistorySourceModule,
  BrowseHistorySourceScene,
} from './types';

export type LibraryPlaceholderSurface = 'bookmark' | 'history';

export const BOOKMARK_COLLECTION_VISIBILITY_LABELS: Readonly<
  Record<BookmarkCollectionVisibility, string>
> = {
  PRIVATE: '仅自己可见',
  FOLLOWERS: '关注者可见',
  PUBLIC: '公开',
};

export const BROWSE_HISTORY_SOURCE_SCENE_LABELS: Readonly<
  Record<BrowseHistorySourceScene, string>
> = {
  POST_DETAIL: '帖子详情',
  SEARCH_RESULT: '搜索结果',
  COMMUNITY_POST: '社群内容',
  PROFILE_POST: '个人主页',
  NOTIFICATION_JUMP: '通知跳转',
};

export const BROWSE_HISTORY_SOURCE_MODULE_LABELS: Readonly<
  Record<BrowseHistorySourceModule, string>
> = {
  POST: '帖子',
  SEARCH: '搜索',
  COMMUNITY: '社群',
  PROFILE: '个人主页',
  NOTIFICATION: '通知',
};

export function getBrowseHistorySourceLabel(input: {
  sourceScene: BrowseHistorySourceScene | null;
  sourceModule: BrowseHistorySourceModule | null;
}): string {
  if (input.sourceScene) return BROWSE_HISTORY_SOURCE_SCENE_LABELS[input.sourceScene];
  if (input.sourceModule) return BROWSE_HISTORY_SOURCE_MODULE_LABELS[input.sourceModule];
  return '未记录来源';
}

const commonPlaceholderMessages: Omit<
  Record<BookmarkPlaceholderReasonCode, string>,
  'DENY_COMMUNITY_POST_MUST_BE_PUBLIC'
> = {
  DENY_POST_NOT_FOUND: '原帖已不存在',
  DENY_POST_STATUS_INVALID: '原帖当前不可访问',
  DENY_POST_FOLLOWERS_ONLY: '原帖仅对关注者开放',
  DENY_POST_PRIVATE: '原帖已转为私密',
  DENY_TARGET_STATUS_INVALID: '作者账号当前不可用',
  DENY_COMMUNITY_NOT_FOUND: '所属社群已不存在',
  DENY_COMMUNITY_STATUS_INVALID: '所属社群当前不可用',
  DENY_COMMUNITY_ARCHIVED: '所属社群已归档',
  DENY_COMMUNITY_BANNED: '你无法访问所属社群',
  DENY_COMMUNITY_JOIN_PENDING: '加入社群申请仍在审核',
  DENY_COMMUNITY_INVITE_ONLY: '所属社群仅限受邀成员',
  DENY_COMMUNITY_MEMBERSHIP_REQUIRED: '需要加入社群后才能查看',
  DENY_COMMUNITY_ROLE_TOO_LOW: '当前社群角色无权查看',
  DENY_COMMUNITY_RULES_NOT_ACCEPTED: '接受社群规则后才能查看',
  CARD_HYDRATION_UNAVAILABLE: '内容卡片暂时加载失败',
};

export function getPostAvailabilityPlaceholderMessage(
  reason: BookmarkPlaceholderReasonCode,
  surface: LibraryPlaceholderSurface,
): string {
  if (reason === 'DENY_COMMUNITY_POST_MUST_BE_PUBLIC') {
    return surface === 'bookmark'
      ? '该社群内容不可在收藏页展示'
      : '该社群内容不可在历史页展示';
  }
  return commonPlaceholderMessages[reason];
}
