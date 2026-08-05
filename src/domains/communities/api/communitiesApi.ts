import { apiClient } from '@/shared/api/client';
import { createIdempotencyKey } from '@/shared/api/idempotency';
import { appendQuery } from '@/shared/api/query';
import type { CursorPage } from '@/shared/api/pagination';
import {
  communityCardToSummary,
  communityDetailToLegacy,
  type CommunityMembershipStateDto,
} from '../lib/communityAdapter';
import type {
  ApproveCommunityJoinRequestResponse,
  ChangeCommunityMemberRoleResponse,
  CommunityAssignableMemberRole,
  CommunityCardBriefView,
  CommunityDetail,
  CommunityDetailView,
  CommunityJoinRequestStatus,
  CommunityManagementOverviewView,
  CommunityMemberRole,
  CommunityModerationActionType,
  CommunityOverviewWindowDays,
  CommunityModerationLogItemView,
  CommunityPinnedPostsView,
  CommunitySummary,
  CreateCommunityInput,
  CreateCommunityResult,
  PageResult,
  PinCommunityPostResponse,
  RejectCommunityJoinRequestResponse,
  RemoveCommunityMemberResponse,
  ReorderCommunityPinnedPostResponse,
  UnpinCommunityPostResponse,
  UpdateCommunityRulesResult,
  UpdateCommunitySettingsInput,
  UpdateCommunitySettingsResult,
  CommunityJoinRequestListItemView,
  CommunityMemberListItemView,
  CommunityPinType,
} from '../model/types';

export interface JoinCommunityResult {
  communityId: string;
  result: 'JOINED' | 'REQUEST_SUBMITTED' | 'ALREADY_JOINED' | 'ALREADY_REQUESTED';
  membershipStatus: 'ACTIVE' | 'PENDING';
  joinRequestId: string | null;
}

export interface LeaveCommunityResult {
  communityId: string;
  result: 'LEFT' | 'ALREADY_LEFT';
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

function getCommunityDetailBySlug(slug: string, signal?: AbortSignal) {
  return apiClient.request<CommunityDetailView>({
    path: `/api/communities/slug/${encodeSegment(slug)}`,
    signal,
  });
}

function getCommunityMembershipStates(communityIds: string[], signal?: AbortSignal) {
  if (communityIds.length === 0) {
    return Promise.resolve({ list: [] as Array<CommunityMembershipStateDto | null> });
  }
  return apiClient.request<
    { list: Array<CommunityMembershipStateDto | null> },
    { communityIds: string[] }
  >({
    method: 'POST',
    path: '/api/communities/membership-states/_batch',
    body: { communityIds },
    signal,
  });
}

export const communitiesApi = {
  list: async (cursor?: string, signal?: AbortSignal): Promise<CursorPage<CommunitySummary>> => {
    const pageNumber = Math.max(1, Number(cursor) || 1);
    const pageSize = 20;
    const page = await apiClient.request<PageResult<CommunityCardBriefView>>({
      path: appendQuery('/api/communities', { page: pageNumber, pageSize }),
      signal,
    });
    const membership = await getCommunityMembershipStates(
      page.list.map((community) => community.communityId),
      signal,
    )
      .catch(() => ({ list: page.list.map(() => null) }));
    const hasMore = page.page * page.pageSize < page.total;
    return {
      list: page.list.map((community, index) =>
        communityCardToSummary(community, membership.list[index] ?? null),
      ),
      nextCursor: hasMore ? String(page.page + 1) : null,
      hasMore,
    };
  },

  detail: async (slug: string, signal?: AbortSignal): Promise<CommunityDetail> => {
    const detail = await getCommunityDetailBySlug(slug, signal);
    return communityDetailToLegacy(detail);
  },

  getMembershipStates: getCommunityMembershipStates,
  getDetailBySlug: getCommunityDetailBySlug,

  getDetailById: (communityId: string, signal?: AbortSignal) =>
    apiClient.request<CommunityDetailView>({
      path: `/api/communities/${encodeSegment(communityId)}`,
      signal,
    }),

  join: (communityId: string, requestMessage: string | null = null) =>
    apiClient.request<JoinCommunityResult, { requestMessage: string | null }>({
      method: 'POST',
      path: `/api/communities/${encodeSegment(communityId)}/join`,
      body: { requestMessage },
      idempotencyKey: createIdempotencyKey('join-community'),
    }),

  leave: (communityId: string) =>
    apiClient.request<LeaveCommunityResult>({
      method: 'DELETE',
      path: `/api/communities/${encodeSegment(communityId)}/members/me`,
      idempotencyKey: createIdempotencyKey('leave-community'),
    }),

  create: (input: CreateCommunityInput, signal?: AbortSignal) =>
    apiClient.request<CreateCommunityResult, CreateCommunityInput>({
      method: 'POST',
      path: '/api/communities',
      body: input,
      idempotencyKey: createIdempotencyKey('create-community'),
      signal,
    }),

  managementOverview: (
    communityId: string,
    days: CommunityOverviewWindowDays = 7,
    signal?: AbortSignal,
  ) =>
    apiClient.request<CommunityManagementOverviewView>({
      path: appendQuery(`/api/communities/${encodeSegment(communityId)}/manage/overview`, { days }),
      signal,
    }),

  listJoinRequests: (
    communityId: string,
    input: {
      status?: CommunityJoinRequestStatus;
      page?: number;
      pageSize?: number;
    } = {},
    signal?: AbortSignal,
  ) =>
    apiClient.request<PageResult<CommunityJoinRequestListItemView>>({
      path: appendQuery(`/api/communities/${encodeSegment(communityId)}/manage/join-requests`, {
        status: input.status ?? 'PENDING',
        page: input.page ?? 1,
        pageSize: input.pageSize ?? 20,
      }),
      signal,
    }),

  approveJoinRequest: (
    communityId: string,
    joinRequestId: string,
    decisionMessage: string | null = null,
  ) =>
    apiClient.request<ApproveCommunityJoinRequestResponse, { decisionMessage: string | null }>({
      method: 'POST',
      path: `/api/communities/${encodeSegment(communityId)}/manage/join-requests/${encodeSegment(joinRequestId)}/approve`,
      body: { decisionMessage },
      idempotencyKey: createIdempotencyKey('approve-community-join-request'),
    }),

  rejectJoinRequest: (
    communityId: string,
    joinRequestId: string,
    decisionMessage: string | null = null,
  ) =>
    apiClient.request<RejectCommunityJoinRequestResponse, { decisionMessage: string | null }>({
      method: 'POST',
      path: `/api/communities/${encodeSegment(communityId)}/manage/join-requests/${encodeSegment(joinRequestId)}/reject`,
      body: { decisionMessage },
      idempotencyKey: createIdempotencyKey('reject-community-join-request'),
    }),

  listMembers: (
    communityId: string,
    input: {
      page?: number;
      pageSize?: number;
      role?: CommunityMemberRole | null;
    } = {},
    signal?: AbortSignal,
  ) =>
    apiClient.request<PageResult<CommunityMemberListItemView>>({
      path: appendQuery(`/api/communities/${encodeSegment(communityId)}/members`, {
        page: input.page ?? 1,
        pageSize: input.pageSize ?? 20,
        role: input.role,
      }),
      signal,
    }),

  changeMemberRole: (
    communityId: string,
    targetUserId: string,
    nextRole: CommunityAssignableMemberRole,
    reason: string | null = null,
  ) =>
    apiClient.request<
      ChangeCommunityMemberRoleResponse,
      { nextRole: CommunityAssignableMemberRole; reason: string | null }
    >({
      method: 'PATCH',
      path: `/api/communities/${encodeSegment(communityId)}/manage/members/${encodeSegment(targetUserId)}/role`,
      body: { nextRole, reason },
      idempotencyKey: createIdempotencyKey('change-community-member-role'),
    }),

  removeMember: (communityId: string, targetUserId: string, reason: string | null = null) =>
    apiClient.request<RemoveCommunityMemberResponse, { reason: string | null }>({
      method: 'DELETE',
      path: `/api/communities/${encodeSegment(communityId)}/manage/members/${encodeSegment(targetUserId)}`,
      body: { reason },
      idempotencyKey: createIdempotencyKey('remove-community-member'),
    }),

  listPinnedPosts: (communityId: string, signal?: AbortSignal) =>
    apiClient.request<CommunityPinnedPostsView>({
      path: `/api/communities/${encodeSegment(communityId)}/pinned-posts`,
      signal,
    }),

  pinPost: (
    communityId: string,
    input: {
      postId: string;
      pinType: CommunityPinType;
      sortOrder: number;
      reason?: string | null;
    },
  ) =>
    apiClient.request<
      PinCommunityPostResponse,
      { postId: string; pinType: CommunityPinType; sortOrder: number; reason: string | null }
    >({
      method: 'POST',
      path: `/api/communities/${encodeSegment(communityId)}/manage/pinned-posts`,
      body: {
        postId: input.postId,
        pinType: input.pinType,
        sortOrder: input.sortOrder,
        reason: input.reason ?? null,
      },
      idempotencyKey: createIdempotencyKey('pin-community-post'),
    }),

  reorderPinnedPost: (
    communityId: string,
    postId: string,
    targetSortOrder: number,
    reason: string | null = null,
  ) =>
    apiClient.request<
      ReorderCommunityPinnedPostResponse,
      { targetSortOrder: number; reason: string | null }
    >({
      method: 'PATCH',
      path: `/api/communities/${encodeSegment(communityId)}/manage/pinned-posts/${encodeSegment(postId)}/order`,
      body: { targetSortOrder, reason },
      idempotencyKey: createIdempotencyKey('reorder-community-pinned-post'),
    }),

  unpinPost: (communityId: string, postId: string, reason: string | null = null) =>
    apiClient.request<UnpinCommunityPostResponse, { reason: string | null }>({
      method: 'DELETE',
      path: `/api/communities/${encodeSegment(communityId)}/manage/pinned-posts/${encodeSegment(postId)}`,
      body: { reason },
      idempotencyKey: createIdempotencyKey('unpin-community-post'),
    }),

  updateRules: (communityId: string, rules: string[]) =>
    apiClient.request<UpdateCommunityRulesResult, { rules: string[] }>({
      method: 'PUT',
      path: `/api/communities/${encodeSegment(communityId)}/rules`,
      body: { rules },
      idempotencyKey: createIdempotencyKey('update-community-rules'),
    }),

  updateSettings: (communityId: string, input: UpdateCommunitySettingsInput) =>
    apiClient.request<UpdateCommunitySettingsResult, UpdateCommunitySettingsInput>({
      method: 'PATCH',
      path: `/api/communities/${encodeSegment(communityId)}/settings`,
      body: input,
      idempotencyKey: createIdempotencyKey('update-community-settings'),
    }),

  listModerationLogs: (
    communityId: string,
    input: {
      page?: number;
      pageSize?: number;
      actionType?: CommunityModerationActionType | null;
      targetUserId?: string | null;
    } = {},
    signal?: AbortSignal,
  ) =>
    apiClient.request<PageResult<CommunityModerationLogItemView>>({
      path: appendQuery(`/api/communities/${encodeSegment(communityId)}/manage/logs`, {
        page: input.page ?? 1,
        pageSize: input.pageSize ?? 20,
        actionType: input.actionType,
        targetUserId: input.targetUserId,
      }),
      signal,
    }),
};
