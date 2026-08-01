import type {
  CommunityJoinRequestStatus,
  CommunityMemberRole,
  CommunityModerationActionType,
  CommunityOverviewWindowDays,
} from './types';

const COMMUNITY_QUERY_ROOT = ['communities'] as const;
const COMMUNITY_LIST_QUERY_ROOT = [...COMMUNITY_QUERY_ROOT, 'list'] as const;
const COMMUNITY_DETAIL_QUERY_ROOT = [...COMMUNITY_QUERY_ROOT, 'detail'] as const;

export const communityKeys = {
  all: COMMUNITY_QUERY_ROOT,
  lists: () => COMMUNITY_LIST_QUERY_ROOT,
  discover: [...COMMUNITY_LIST_QUERY_ROOT, 'discover'] as const,
  explore: [...COMMUNITY_LIST_QUERY_ROOT, 'explore'] as const,
  composeOptions: [...COMMUNITY_LIST_QUERY_ROOT, 'compose-options'] as const,
  details: () => COMMUNITY_DETAIL_QUERY_ROOT,
  detail: (slug: string) => [...COMMUNITY_DETAIL_QUERY_ROOT, slug] as const,
  posts: (slug: string) => [...COMMUNITY_DETAIL_QUERY_ROOT, slug, 'posts'] as const,
};

export const communityManageKeys = {
  root: (communityId: string) => [...communityKeys.all, communityId, 'manage'] as const,
  detail: (communityId: string) => [...communityManageKeys.root(communityId), 'detail'] as const,
  overview: (communityId: string, days: CommunityOverviewWindowDays) =>
    [...communityManageKeys.root(communityId), 'overview', days] as const,
  requestsRoot: (communityId: string) =>
    [...communityManageKeys.root(communityId), 'join-requests'] as const,
  requests: (
    communityId: string,
    status: CommunityJoinRequestStatus,
    page: number,
    pageSize: number,
  ) => [...communityManageKeys.requestsRoot(communityId), status, page, pageSize] as const,
  membersRoot: (communityId: string) =>
    [...communityManageKeys.root(communityId), 'members'] as const,
  members: (
    communityId: string,
    role: CommunityMemberRole | null,
    page: number,
    pageSize: number,
  ) => [...communityManageKeys.membersRoot(communityId), role ?? 'ALL', page, pageSize] as const,
  pinned: (communityId: string) =>
    [...communityManageKeys.root(communityId), 'pinned-posts'] as const,
  logsRoot: (communityId: string) =>
    [...communityManageKeys.root(communityId), 'logs'] as const,
  logs: (
    communityId: string,
    actionType: CommunityModerationActionType | null,
    page: number,
    pageSize: number,
  ) => [...communityManageKeys.logsRoot(communityId), actionType ?? 'ALL', page, pageSize] as const,
};
