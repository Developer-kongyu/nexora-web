import { fixtureState } from './fixtures.state';
import type {
  UserProfileHeaderView,
  UserProfileEditableView,
  UpdateOwnProfileRequest,
  UserRelationSnapshotView,
  UserListItemView,
  UserManagementListItemView,
} from '@/domains/users/model';
import { canonicalizeHttpUrl } from '@/shared/lib/url';
import { isDateOnly } from '@/shared/lib/date';
import { apiError, ok, pagedMockList } from '../handlers/http';

export type MockProfilePatchParseResult =
  { ok: true; value: UpdateOwnProfileRequest } | { ok: false; message: string };

export interface MockFollowListEdge {
  userId: string;
  followedAt: string;
}

export interface MockMuteRecord {
  targetUserId: string;
  mutePosts: boolean;
  muteNotifications: boolean;
  updatedAt: string;
}

export interface MockBlockRecord {
  targetUserId: string;
  updatedAt: string;
  canUnblock: boolean;
}

function createUsersState() {
  let mockIncomingFollowRequests = fixtureState.incomingFollowRequests.map((item) => ({ ...item }));

  const mockUserProfiles: Record<string, UserProfileHeaderView> = Object.fromEntries(
    Object.entries(fixtureState.userProfileHeaders).map(([handle, profile]) => [
      handle,
      {
        ...profile,
        stats: { ...profile.stats },
        relationship: profile.relationship ? { ...profile.relationship } : null,
      },
    ]),
  );

  let mockEditableProfile: UserProfileEditableView = {
    userId: fixtureState.currentUser.id,
    displayName: fixtureState.currentUser.displayName,
    bio: fixtureState.currentUser.bio ?? null,
    location: fixtureState.currentUser.location ?? null,
    websiteUrl: fixtureState.currentUser.website ?? null,
    birthday: null,
    avatarStorageKey: null,
    coverStorageKey: null,
    avatarUrl: fixtureState.currentUser.avatarUrl,
    coverUrl: fixtureState.currentUser.coverUrl,
    avatarMediaState: fixtureState.currentUser.avatarUrl ? 'READY' : 'MISSING',
    coverMediaState: fixtureState.currentUser.coverUrl ? 'READY' : 'MISSING',
    updatedAt: '2026-07-27T10:00:00.000Z',
  };

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

  function relationSummary(
    relation: UserRelationSnapshotView,
  ): UserRelationSnapshotView['summary'] {
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
      viewerUserId: fixtureState.currentUser.id,
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

  const mockFollowersByHandle: Record<string, MockFollowListEdge[]> = {
    zhiqiu: [
      { userId: 'u-xm', followedAt: '2026-07-27T08:00:00.000Z' },
      { userId: 'u-travel', followedAt: '2026-07-26T08:00:00.000Z' },
      { userId: 'u-pm', followedAt: '2026-07-24T08:00:00.000Z' },
    ],
    xiaoming: [{ userId: fixtureState.currentUser.id, followedAt: '2026-07-25T08:00:00.000Z' }],
    travel_log: [],
    pm_helper: [],
    aqiang_dev: [],
  };

  const mockFollowingByHandle: Record<string, MockFollowListEdge[]> = {
    zhiqiu: [{ userId: 'u-xm', followedAt: '2026-07-25T08:00:00.000Z' }],
    xiaoming: [{ userId: fixtureState.currentUser.id, followedAt: '2026-07-27T08:00:00.000Z' }],
    travel_log: [{ userId: fixtureState.currentUser.id, followedAt: '2026-07-26T08:00:00.000Z' }],
    pm_helper: [{ userId: fixtureState.currentUser.id, followedAt: '2026-07-24T08:00:00.000Z' }],
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
    return fixtureState.users.find((user) => user.id === userId) ?? null;
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
    const target = fixtureState.users.find((user) => user.handle === targetHandle);
    if (!target) return;
    const now = new Date().toISOString();
    const ownFollowing = (mockFollowingByHandle[fixtureState.currentUser.handle] ??= []);
    if (!ownFollowing.some((edge) => edge.userId === target.id)) {
      ownFollowing.unshift({ userId: target.id, followedAt: now });
    }
    const targetFollowers = (mockFollowersByHandle[target.handle] ??= []);
    if (!targetFollowers.some((edge) => edge.userId === fixtureState.currentUser.id)) {
      targetFollowers.unshift({ userId: fixtureState.currentUser.id, followedAt: now });
    }
  }

  function removeMockFollowEdge(targetHandle: string): void {
    const target = fixtureState.users.find((user) => user.handle === targetHandle);
    if (!target) return;
    mockFollowingByHandle[fixtureState.currentUser.handle] = (
      mockFollowingByHandle[fixtureState.currentUser.handle] ?? []
    ).filter((edge) => edge.userId !== target.id);
    mockFollowersByHandle[target.handle] = (mockFollowersByHandle[target.handle] ?? []).filter(
      (edge) => edge.userId !== fixtureState.currentUser.id,
    );
  }
  return {
    get mockIncomingFollowRequests() {
      return mockIncomingFollowRequests;
    },
    set mockIncomingFollowRequests(value: typeof mockIncomingFollowRequests) {
      mockIncomingFollowRequests = value;
    },
    mockUserProfiles,
    get mockEditableProfile() {
      return mockEditableProfile;
    },
    set mockEditableProfile(value: typeof mockEditableProfile) {
      mockEditableProfile = value;
    },
    parseMockProfilePatch,
    relationSummary,
    updateMockRelation,
    mockRelationTargetNotFound,
    mockFollowersByHandle,
    mockFollowingByHandle,
    get mockMuteRecords() {
      return mockMuteRecords;
    },
    set mockMuteRecords(value: typeof mockMuteRecords) {
      mockMuteRecords = value;
    },
    get mockBlockRecords() {
      return mockBlockRecords;
    },
    set mockBlockRecords(value: typeof mockBlockRecords) {
      mockBlockRecords = value;
    },
    seedMockRelation,
    mockUserById,
    mockRelationshipByUserId,
    mockMuteByUserId,
    isMockBlocked,
    toUserListItem,
    toManagementListItem,
    mockUserConnectionList,
    addMockFollowEdge,
    removeMockFollowEdge,
  };
}

export let usersState = createUsersState();

export function resetUsersState(): void {
  usersState = createUsersState();
}
