import { apiClient } from '@/shared/api/client';
import type {
  AccountVisibility,
  PermissionAudience,
  PermissionPolicy,
  PermissionPreview,
} from '../model/types';

interface BackendPermissionPolicy {
  accountVisibility: AccountVisibility;
  allowSearchIndex: boolean;
  defaultPostVisibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE' | 'UNLISTED';
  defaultLikePermission: 'EVERYONE' | 'FOLLOWING' | 'MUTUALS' | 'NO_ONE';
  defaultBookmarkPermission: 'EVERYONE' | 'FOLLOWING' | 'MUTUALS' | 'NO_ONE';
  defaultCommentPermission: 'EVERYONE' | 'FOLLOWING' | 'MUTUALS' | 'NO_ONE';
  defaultQuotePermission: 'EVERYONE' | 'FOLLOWING' | 'NO_ONE';
  defaultRepostPermission: 'EVERYONE' | 'FOLLOWING' | 'NO_ONE';
  mentionPermission: 'EVERYONE' | 'FOLLOWING' | 'NO_ONE';
  followerListVisibility: 'EVERYONE' | 'FOLLOWERS' | 'SELF_ONLY';
  followingListVisibility: 'EVERYONE' | 'FOLLOWERS' | 'SELF_ONLY';
  birthdayVisibility: 'HIDDEN' | 'FOLLOWERS' | 'EVERYONE';
}

function audience(value: 'EVERYONE' | 'FOLLOWING' | 'MUTUALS' | 'NO_ONE'): PermissionAudience {
  if (value === 'EVERYONE') return 'everyone';
  if (value === 'NO_ONE') return 'none';
  return 'following';
}

function toView(value: BackendPermissionPolicy): PermissionPolicy {
  return {
    profileVisibility: value.accountVisibility === 'PRIVATE' ? 'private' : 'public',
    showOnlineStatus: true,
    showConnections:
      value.followerListVisibility !== 'SELF_ONLY' && value.followingListVisibility !== 'SELF_ONLY',
    discoverByEmail: false,
    discoverByPhone: false,
    searchEngineIndexing: value.allowSearchIndex,
    allowComments:
      value.defaultCommentPermission === 'MUTUALS'
        ? 'followers'
        : audience(value.defaultCommentPermission),
    allowMentions: audience(value.mentionPermission),
    allowQuotes: audience(value.defaultQuotePermission),
    allowMessages: 'following',
  };
}

function toPatch(value: PermissionPolicy) {
  const commentPermission =
    value.allowComments === 'everyone'
      ? 'EVERYONE'
      : value.allowComments === 'none'
        ? 'NO_ONE'
        : value.allowComments === 'followers'
          ? 'MUTUALS'
          : 'FOLLOWING';
  const mapAudience = (item: PermissionAudience) =>
    item === 'everyone'
      ? ('EVERYONE' as const)
      : item === 'none'
        ? ('NO_ONE' as const)
        : ('FOLLOWING' as const);
  return {
    accountVisibility:
      value.profileVisibility === 'private' ? ('PRIVATE' as const) : ('PUBLIC' as const),
    allowSearchIndex: value.searchEngineIndexing,
    defaultCommentPermission: commentPermission,
    defaultQuotePermission: mapAudience(value.allowQuotes),
    mentionPermission: mapAudience(value.allowMentions),
    followerListVisibility: value.showConnections ? ('EVERYONE' as const) : ('SELF_ONLY' as const),
    followingListVisibility: value.showConnections ? ('EVERYONE' as const) : ('SELF_ONLY' as const),
  };
}

export const permissionsApi = {
  get: async () =>
    toView(
      await apiClient.request<BackendPermissionPolicy>({ path: '/api/permissions/me/policy' }),
    ),
  update: async (policy: PermissionPolicy) => {
    const result = await apiClient.request<
      { snapshot: BackendPermissionPolicy },
      ReturnType<typeof toPatch>
    >({
      method: 'PATCH',
      path: '/api/permissions/me/policy',
      body: toPatch(policy),
    });
    return toView(result.snapshot);
  },
  preview: async (policy: PermissionPolicy): Promise<PermissionPreview> => {
    const result = await apiClient.request<
      { previewPolicy: BackendPermissionPolicy },
      ReturnType<typeof toPatch>
    >({
      method: 'POST',
      path: '/api/permissions/me/policy/preview',
      body: toPatch(policy),
    });
    return {
      profileSummary: result.previewPolicy.accountVisibility,
      interactionSummary: result.previewPolicy.defaultCommentPermission,
      discoverySummary: result.previewPolicy.allowSearchIndex ? 'INDEXED' : 'NOT_INDEXED',
    };
  },
};
