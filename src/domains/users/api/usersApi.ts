import { apiClient } from '@/shared/api/client';
import { buildCursorQuery, type CursorPageView } from '@/shared/api/pagination';
import type {
  ApproveFollowRequestResult,
  BlockedUserManagementListItemView,
  BlockUserResult,
  CancelFollowRequestResult,
  DeleteUserRelationResult,
  FollowUserResult,
  RejectFollowRequestResult,
  UnfollowUserResult,
  UpsertUserMuteResult,
  UserFollowRelationshipWriteResult,
  UserListItemView,
  UserManagementCursorPage,
  UserManagementListItemView,
  UserMuteFlagsView,
  UserProfileEditableView,
  UserProfileHeaderView,
  UserRelationSnapshotView,
} from '../model/types';
import type { UserRelationshipAction } from '../model/relationActions';

export interface UpdateOwnProfileRequest {
  displayName?: string;
  bio?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  birthday?: string | null;
  avatarStorageKey?: string | null;
  coverStorageKey?: string | null;
}

export const usersApi = {
  profile: (handle: string, signal?: AbortSignal) =>
    apiClient.request<UserProfileHeaderView>({
      path: `/api/users/${encodeURIComponent(handle)}`,
      signal,
    }),

  relationship: (handle: string, signal?: AbortSignal) =>
    apiClient.request<UserRelationSnapshotView>({
      path: `/api/users/${encodeURIComponent(handle)}/relationship`,
      signal,
    }),

  getOwnEditableProfile: (signal?: AbortSignal) =>
    apiClient.request<UserProfileEditableView>({
      path: '/api/users/me/profile',
      signal,
    }),

  updateOwnProfile: (input: UpdateOwnProfileRequest, signal?: AbortSignal) =>
    apiClient.request<UserProfileEditableView, UpdateOwnProfileRequest>({
      path: '/api/users/me/profile',
      method: 'PATCH',
      body: input,
      signal,
    }),

  incomingFollowRequests: (cursor?: string | null, limit = 20, signal?: AbortSignal) =>
    apiClient.request<UserManagementCursorPage>({
      path: `/api/users/me/follow-requests/incoming${buildCursorQuery({ cursor, limit })}`,
      signal,
    }),

  approveFollowRequest: (followRequestId: string) =>
    apiClient.request<ApproveFollowRequestResult>({
      method: 'POST',
      path: `/api/users/me/follow-requests/${encodeURIComponent(followRequestId)}/approve`,
    }),

  rejectFollowRequest: (followRequestId: string) =>
    apiClient.request<RejectFollowRequestResult>({
      method: 'POST',
      path: `/api/users/me/follow-requests/${encodeURIComponent(followRequestId)}/reject`,
    }),

  followers: (handle: string, cursor?: string | null, limit = 20, signal?: AbortSignal) =>
    apiClient.request<CursorPageView<UserListItemView>>({
      path: `/api/users/${encodeURIComponent(handle)}/followers${buildCursorQuery({ cursor, limit })}`,
      signal,
    }),

  following: (handle: string, cursor?: string | null, limit = 20, signal?: AbortSignal) =>
    apiClient.request<CursorPageView<UserListItemView>>({
      path: `/api/users/${encodeURIComponent(handle)}/following${buildCursorQuery({ cursor, limit })}`,
      signal,
    }),

  mutedUsers: (cursor?: string | null, limit = 20, signal?: AbortSignal) =>
    apiClient.request<CursorPageView<UserManagementListItemView>>({
      path: `/api/users/me/mutes${buildCursorQuery({ cursor, limit })}`,
      signal,
    }),

  blockedUsers: (cursor?: string | null, limit = 20, signal?: AbortSignal) =>
    apiClient.request<CursorPageView<BlockedUserManagementListItemView>>({
      path: `/api/users/me/blocks${buildCursorQuery({ cursor, limit })}`,
      signal,
    }),

  follow: (handle: string) =>
    apiClient.request<FollowUserResult>({
      method: 'POST',
      path: `/api/users/${encodeURIComponent(handle)}/follow`,
    }),

  unfollow: (handle: string) =>
    apiClient.request<UnfollowUserResult>({
      method: 'DELETE',
      path: `/api/users/${encodeURIComponent(handle)}/follow`,
    }),

  cancelFollowRequest: (handle: string) =>
    apiClient.request<CancelFollowRequestResult>({
      method: 'DELETE',
      path: `/api/users/${encodeURIComponent(handle)}/follow-request`,
    }),

  mute: (handle: string, input: UserMuteFlagsView) =>
    apiClient.request<UpsertUserMuteResult, UserMuteFlagsView>({
      method: 'PUT',
      path: `/api/users/${encodeURIComponent(handle)}/mute`,
      body: input,
    }),

  unmute: (handle: string) =>
    apiClient.request<DeleteUserRelationResult>({
      method: 'DELETE',
      path: `/api/users/${encodeURIComponent(handle)}/mute`,
    }),

  block: (handle: string) =>
    apiClient.request<BlockUserResult>({
      method: 'POST',
      path: `/api/users/${encodeURIComponent(handle)}/block`,
    }),

  unblock: (handle: string) =>
    apiClient.request<DeleteUserRelationResult>({
      method: 'DELETE',
      path: `/api/users/${encodeURIComponent(handle)}/block`,
    }),
};

export function performUserRelationshipAction(
  handle: string,
  action: UserRelationshipAction,
): Promise<UserFollowRelationshipWriteResult> {
  switch (action) {
    case 'follow':
      return usersApi.follow(handle);
    case 'unfollow':
      return usersApi.unfollow(handle);
    case 'cancel-request':
      return usersApi.cancelFollowRequest(handle);
  }
}
