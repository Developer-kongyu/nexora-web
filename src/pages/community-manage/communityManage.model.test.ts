import { describe, expect, it } from 'vitest';
import type {
  CommunityDetailView,
  CommunityPermissionContextView,
  CommunityPermissionRole,
} from '@/domains/communities';
import { getCommunityManageAccess } from './communityManage.model';

function makeDetail(
  actorRole: CommunityPermissionRole,
  context: Partial<CommunityPermissionContextView> = {},
): CommunityDetailView {
  return {
    community: {
      communityId: 'community-1',
      slug: 'community-one',
      name: 'Community One',
      description: null,
      avatarKey: null,
      avatarUrl: null,
      coverKey: null,
      coverUrl: null,
      categoryKey: null,
      tags: [],
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      joinPolicy: 'OPEN',
      memberCount: 1,
      postCount: 0,
      pinnedPostCount: 0,
      ownerUserId: 'owner-1',
      createdAtIso: '2026-08-05T00:00:00.000Z',
      updatedAtIso: '2026-08-05T00:00:00.000Z',
      postRoleMin: 'MEMBER',
      commentRoleMin: 'VISITOR',
      quoteEnabled: true,
      repostEnabled: true,
      requireRuleAcceptanceBeforePost: false,
      rulesVersion: 1,
      settingsVersion: 1,
    },
    rules: [],
    managers: [],
    pinnedPosts: [],
    viewerContext: {
      communityId: 'community-1',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      joinPolicy: 'OPEN',
      postRoleMin: 'MEMBER',
      commentRoleMin: 'VISITOR',
      quoteEnabled: true,
      repostEnabled: true,
      requireRuleAcceptanceBeforePost: false,
      rulesVersion: 1,
      settingsVersion: 1,
      actorMembershipStatus: actorRole === 'VISITOR' ? 'NONE' : 'ACTIVE',
      actorRole,
      actorHasAcceptedCurrentRules: true,
      canViewCommunity: true,
      canManageCommunity:
        actorRole === 'MODERATOR' || actorRole === 'ADMIN' || actorRole === 'OWNER',
      canReviewJoinRequests:
        actorRole === 'MODERATOR' || actorRole === 'ADMIN' || actorRole === 'OWNER',
      canPinPost: actorRole === 'MODERATOR' || actorRole === 'ADMIN' || actorRole === 'OWNER',
      canPublishPost: actorRole !== 'VISITOR',
      ...context,
    },
  };
}

describe('getCommunityManageAccess', () => {
  it('fails closed for a member without management permission', () => {
    expect(getCommunityManageAccess(makeDetail('MEMBER'))).toEqual({
      sections: [],
      canChangeMemberRoles: false,
      canRemoveMembers: false,
    });
  });

  it('gives moderators only the backend moderator capabilities', () => {
    expect(getCommunityManageAccess(makeDetail('MODERATOR'))).toEqual({
      sections: ['overview', 'requests', 'members', 'pinned', 'logs'],
      canChangeMemberRoles: false,
      canRemoveMembers: true,
    });
  });

  it('adds rule and settings writes for administrators', () => {
    expect(getCommunityManageAccess(makeDetail('ADMIN'))).toEqual({
      sections: ['overview', 'requests', 'members', 'pinned', 'rules', 'logs', 'settings'],
      canChangeMemberRoles: true,
      canRemoveMembers: true,
    });
  });
});
