import type {
  CommunitySummary,
  CreateCommunityInput,
  CommunityCardBriefView,
  UpdateCommunitySettingsInput,
  UserPublicCardView,
  CommunityJoinRequestListItemView,
  CommunityMemberListItemView,
  CommunityProfileSnapshot,
  CommunitySettingsSnapshot,
  CommunityPinnedPostListItemView,
  CommunityManagementOverviewDailyItemView,
  CommunityModerationLogItemView,
  CommunityModerationActionType,
  CommunityModerationMetadata,
  CommunityDetailView,
} from '@/domains/communities/model';
import { fixtureState } from './fixtures.state';
import { postsState } from './posts.state';

export interface MockCreatedCommunity {
  summary: CommunitySummary;
  input: CreateCommunityInput;
}

export interface MockCommunitySettings extends Required<UpdateCommunitySettingsInput> {
  settingsVersion: number;
  updatedAtIso: string;
}

function createCommunitiesState() {
  let mockCreatedCommunities: MockCreatedCommunity[] = [];

  function allCommunitySummaries(): CommunitySummary[] {
    return [...mockCreatedCommunities.map((item) => item.summary), ...fixtureState.communities];
  }

  function mockCommunityCard(summary: CommunitySummary): CommunityCardBriefView {
    const created = mockCreatedCommunities.find((item) => item.summary.id === summary.id);
    const managed = summary.id === MOCK_COMMUNITY_ID;
    return {
      communityId: summary.id,
      slug: summary.slug,
      name: summary.name,
      description: summary.description || null,
      avatarKey: null,
      avatarUrl: summary.avatarUrl,
      coverKey: null,
      coverUrl: null,
      categoryKey: created?.input.categoryKey ?? (managed ? 'AI_PRODUCT' : null),
      tags: created?.input.tags ?? [],
      status: 'ACTIVE',
      visibility: managed ? mockCommunitySettings.visibility : 'PUBLIC',
      joinPolicy: managed
        ? mockCommunitySettings.joinPolicy
        : (created?.input.joinPolicy ?? 'OPEN'),
      memberCount: managed ? mockCommunityMembers.length : summary.membersCount,
      postCount: managed ? fixtureState.posts.length : 0,
      pinnedPostCount: managed ? mockCommunityPinnedPosts.length : 0,
      ownerUserId: fixtureState.currentUser.id,
      createdAtIso: managed ? MOCK_COMMUNITY_CREATED_AT : '2026-07-01T00:00:00.000Z',
      updatedAtIso: managed ? mockCommunityUpdatedAtIso : '2026-07-28T00:00:00.000Z',
    };
  }

  const MOCK_COMMUNITY_ID = 'c-1';

  const MOCK_COMMUNITY_CREATED_AT = '2025-02-01T08:00:00.000Z';

  function mockUserPublicCard(userId: string): UserPublicCardView | null {
    const user = fixtureState.users.find((candidate) => candidate.id === userId);
    if (!user) return null;
    const profile = fixtureState.userProfileHeaders[user.handle];
    return {
      userId: user.id,
      handle: user.handle,
      displayName: user.displayName,
      bio: user.bio ?? null,
      avatarUrl: user.avatarUrl,
      followersCount: user.followersCount ?? 0,
      profileVersion: profile?.profileVersion ?? null,
      source: 'PROJECTION',
      freshness: profile?.profileVersion ? 'VERSIONED' : 'BEST_EFFORT',
      relationship: profile?.relationship ? { ...profile.relationship } : null,
    };
  }

  function mockJoinApplicantEntry(
    userId: string,
  ): CommunityJoinRequestListItemView['applicantEntry'] {
    const user = fixtureState.users.find((candidate) => candidate.id === userId);
    const profile = user ? fixtureState.userProfileHeaders[user.handle] : null;
    if (!user || !profile?.relationship) {
      return {
        userId,
        handle: null,
        displayName: null,
        bio: null,
        avatarUrl: null,
        relationship: null,
        cardState: 'PLACEHOLDER',
        placeholderReason: 'ACCOUNT_DISABLED',
      };
    }
    return {
      userId: user.id,
      handle: user.handle,
      displayName: user.displayName,
      bio: user.bio ?? null,
      avatarUrl: user.avatarUrl,
      relationship: { ...profile.relationship },
      cardState: 'FULL',
      placeholderReason: null,
    };
  }

  function mockCommunityMember(
    userId: string,
    role: CommunityMemberListItemView['role'],
    joinedAtIso: string,
  ): CommunityMemberListItemView {
    const userCard = mockUserPublicCard(userId);
    if (!userCard) throw new Error(`Missing mock member fixture: ${userId}`);
    return { userId, role, joinedAtIso, userCard };
  }

  let mockCommunitySettings: MockCommunitySettings = {
    visibility: 'PUBLIC',
    joinPolicy: 'APPROVAL',
    postRoleMin: 'MEMBER',
    commentRoleMin: 'VISITOR',
    quoteEnabled: true,
    repostEnabled: true,
    requireRuleAcceptanceBeforePost: true,
    settingsVersion: 4,
    updatedAtIso: '2026-07-27T10:00:00.000Z',
  };

  function mockCommunityProfileSnapshot(): CommunityProfileSnapshot {
    return {
      slug: 'ai-product',
      name: 'AI 产品讨论组',
      description: 'AI 产品、工作流、提示词与真实落地案例。',
      avatarKey: null,
      coverKey: null,
      categoryKey: 'AI_PRODUCT',
      tags: ['人工智能', '产品设计', '工作流'],
      locale: 'zh-CN',
      regionCode: 'CN',
    };
  }

  function mockCommunitySettingsSnapshot(
    settings: MockCommunitySettings = mockCommunitySettings,
  ): CommunitySettingsSnapshot {
    return {
      visibility: settings.visibility,
      joinPolicy: settings.joinPolicy,
      postRoleMin: settings.postRoleMin,
      commentRoleMin: settings.commentRoleMin,
      quoteEnabled: settings.quoteEnabled,
      repostEnabled: settings.repostEnabled,
      requireRuleAcceptanceBeforePost: settings.requireRuleAcceptanceBeforePost,
      settingsVersion: settings.settingsVersion,
    };
  }

  let mockCommunityRules = [
    '尊重他人，围绕 AI 产品与真实实践讨论',
    '禁止广告、人身攻击和未经允许的商业推广',
    '引用外部内容时请标注来源与授权状态',
  ];

  let mockCommunityRulesVersion = 3;

  let mockCommunityUpdatedAtIso = '2026-07-27T10:00:00.000Z';

  let mockCommunityMembers: CommunityMemberListItemView[] = [
    mockCommunityMember('user-current', 'OWNER', '2025-02-01T08:00:00.000Z'),
    mockCommunityMember('u-xm', 'MODERATOR', '2025-05-12T08:00:00.000Z'),
    mockCommunityMember('u-dev', 'MEMBER', '2026-01-18T08:00:00.000Z'),
  ];

  const mockCommunityJoinRequests: CommunityJoinRequestListItemView[] = [
    {
      joinRequestId: 'join-request-1',
      applicantUserId: 'u-travel',
      status: 'PENDING',
      requestMessage: '希望分享城市摄影中的 AI 后期工作流，也参与真实产品案例讨论。',
      decisionMessage: null,
      createdAtIso: '2026-07-28T07:30:00.000Z',
      reviewedAtIso: null,
      applicantEntry: mockJoinApplicantEntry('u-travel'),
    },
    {
      joinRequestId: 'join-request-2',
      applicantUserId: 'u-pm',
      status: 'PENDING',
      requestMessage: '关注 PRD、产品协作与 AI 工作流，希望参与内容共创。',
      decisionMessage: null,
      createdAtIso: '2026-07-27T13:05:00.000Z',
      reviewedAtIso: null,
      applicantEntry: mockJoinApplicantEntry('u-pm'),
    },
    {
      joinRequestId: 'join-request-history-1',
      applicantUserId: 'u-disabled',
      status: 'REJECTED',
      requestMessage: null,
      decisionMessage: '账号当前不可用。',
      createdAtIso: '2026-07-20T09:00:00.000Z',
      reviewedAtIso: '2026-07-20T10:30:00.000Z',
      applicantEntry: mockJoinApplicantEntry('u-disabled'),
    },
  ];

  let mockCommunityPinnedPosts: CommunityPinnedPostListItemView[] = [
    {
      postId: 'post-1',
      pinType: 'NORMAL',
      sortOrder: 1,
      pinnedByUserId: fixtureState.currentUser.id,
      pinnedAtIso: '2026-07-26T10:20:00.000Z',
      postCard: postsState.requiredMockPostCard('post-1'),
    },
  ];

  const mockCommunityDaily: CommunityManagementOverviewDailyItemView[] = [
    { date: '2026-07-22', newMemberCount: 3, newJoinRequestCount: 1, newPostCount: 8 },
    { date: '2026-07-23', newMemberCount: 2, newJoinRequestCount: 2, newPostCount: 6 },
    { date: '2026-07-24', newMemberCount: 4, newJoinRequestCount: 1, newPostCount: 9 },
    { date: '2026-07-25', newMemberCount: 1, newJoinRequestCount: 0, newPostCount: 5 },
    { date: '2026-07-26', newMemberCount: 5, newJoinRequestCount: 3, newPostCount: 11 },
    { date: '2026-07-27', newMemberCount: 2, newJoinRequestCount: 1, newPostCount: 7 },
    { date: '2026-07-28', newMemberCount: 1, newJoinRequestCount: 2, newPostCount: 4 },
  ];

  let mockCommunityLogs: CommunityModerationLogItemView[] = [
    {
      logId: 'community-log-4',
      actionType: 'COMMUNITY_JOIN_REQUEST_CREATED',
      actorUserId: 'u-travel',
      targetUserId: 'u-travel',
      postId: null,
      joinRequestId: 'join-request-1',
      reason: null,
      metadata: {
        kind: 'COMMUNITY_JOIN_REQUEST_CREATED',
        applicantUserId: 'u-travel',
        requestMessage: '希望分享城市摄影中的 AI 后期工作流，也参与真实产品案例讨论。',
      },
      actorUser: mockUserPublicCard('u-travel'),
      targetUser: mockUserPublicCard('u-travel'),
      createdAtIso: '2026-07-28T07:30:00.000Z',
    },
    {
      logId: 'community-log-3',
      actionType: 'COMMUNITY_POST_PINNED',
      actorUserId: fixtureState.currentUser.id,
      targetUserId: null,
      postId: 'post-1',
      joinRequestId: null,
      reason: '本周精选讨论',
      metadata: {
        kind: 'COMMUNITY_PINNED_POST_CHANGED',
        postId: 'post-1',
        pinType: 'NORMAL',
        sortOrder: 1,
        action: 'PINNED',
        reason: '本周精选讨论',
        occurredAtIso: '2026-07-26T10:20:00.000Z',
      },
      actorUser: mockUserPublicCard(fixtureState.currentUser.id),
      targetUser: null,
      createdAtIso: '2026-07-26T10:20:00.000Z',
    },
    {
      logId: 'community-log-2',
      actionType: 'COMMUNITY_SETTINGS_UPDATED',
      actorUserId: fixtureState.currentUser.id,
      targetUserId: null,
      postId: null,
      joinRequestId: null,
      reason: null,
      metadata: {
        kind: 'COMMUNITY_SETTINGS_UPDATED',
        before: {
          ...mockCommunitySettingsSnapshot(),
          requireRuleAcceptanceBeforePost: false,
          settingsVersion: 3,
        },
        after: mockCommunitySettingsSnapshot(),
        updatedFields: ['requireRuleAcceptanceBeforePost'],
      },
      actorUser: mockUserPublicCard(fixtureState.currentUser.id),
      targetUser: null,
      createdAtIso: '2026-07-27T10:00:00.000Z',
    },
    {
      logId: 'community-log-1',
      actionType: 'COMMUNITY_CREATED',
      actorUserId: fixtureState.currentUser.id,
      targetUserId: null,
      postId: null,
      joinRequestId: null,
      reason: null,
      metadata: {
        kind: 'COMMUNITY_CREATED',
        profile: mockCommunityProfileSnapshot(),
        settings: {
          ...mockCommunitySettingsSnapshot(),
          settingsVersion: 1,
        },
        ruleCount: 3,
        ownerUserId: fixtureState.currentUser.id,
      },
      actorUser: mockUserPublicCard(fixtureState.currentUser.id),
      targetUser: null,
      createdAtIso: MOCK_COMMUNITY_CREATED_AT,
    },
  ];

  function addMockCommunityLog(input: {
    actionType: CommunityModerationActionType;
    targetUserId?: string | null;
    postId?: string | null;
    joinRequestId?: string | null;
    reason?: string | null;
    metadata?: CommunityModerationMetadata | null;
    createdAtIso?: string;
  }) {
    const createdAtIso = input.createdAtIso ?? new Date().toISOString();
    mockCommunityLogs = [
      {
        logId: crypto.randomUUID(),
        actionType: input.actionType,
        actorUserId: fixtureState.currentUser.id,
        targetUserId: input.targetUserId ?? null,
        postId: input.postId ?? null,
        joinRequestId: input.joinRequestId ?? null,
        reason: input.reason ?? null,
        metadata: input.metadata ?? null,
        actorUser: mockUserPublicCard(fixtureState.currentUser.id),
        targetUser: input.targetUserId ? mockUserPublicCard(input.targetUserId) : null,
        createdAtIso,
      },
      ...mockCommunityLogs,
    ];
  }

  function mockCommunityDetail(): CommunityDetailView {
    const managerRoles = new Set(['OWNER', 'ADMIN', 'MODERATOR']);
    return {
      community: {
        communityId: MOCK_COMMUNITY_ID,
        slug: 'ai-product',
        name: 'AI 产品讨论组',
        description: 'AI 产品、工作流、提示词与真实落地案例。',
        avatarKey: null,
        avatarUrl: null,
        coverKey: null,
        coverUrl: null,
        categoryKey: 'AI_PRODUCT',
        tags: ['人工智能', '产品设计', '工作流'],
        status: 'ACTIVE',
        visibility: mockCommunitySettings.visibility,
        joinPolicy: mockCommunitySettings.joinPolicy,
        memberCount: mockCommunityMembers.length,
        postCount: fixtureState.posts.length,
        pinnedPostCount: mockCommunityPinnedPosts.length,
        ownerUserId: fixtureState.currentUser.id,
        createdAtIso: MOCK_COMMUNITY_CREATED_AT,
        updatedAtIso: mockCommunityUpdatedAtIso,
        postRoleMin: mockCommunitySettings.postRoleMin,
        commentRoleMin: mockCommunitySettings.commentRoleMin,
        quoteEnabled: mockCommunitySettings.quoteEnabled,
        repostEnabled: mockCommunitySettings.repostEnabled,
        requireRuleAcceptanceBeforePost: mockCommunitySettings.requireRuleAcceptanceBeforePost,
        rulesVersion: mockCommunityRulesVersion,
        settingsVersion: mockCommunitySettings.settingsVersion,
      },
      rules: mockCommunityRules.map((content, index) => ({ sortOrder: index + 1, content })),
      managers: mockCommunityMembers
        .filter((member) => managerRoles.has(member.role))
        .map((member) => ({
          state: 'READY' as const,
          userId: member.userId,
          role: member.role as 'OWNER' | 'ADMIN' | 'MODERATOR',
          userCard: member.userCard,
        })),
      pinnedPosts: mockCommunityPinnedPosts.map(
        (item) => postsState.mockPostCard(item.postId) ?? item.postCard,
      ),
      viewerContext: {
        communityId: MOCK_COMMUNITY_ID,
        status: 'ACTIVE',
        visibility: mockCommunitySettings.visibility,
        joinPolicy: mockCommunitySettings.joinPolicy,
        postRoleMin: mockCommunitySettings.postRoleMin,
        commentRoleMin: mockCommunitySettings.commentRoleMin,
        quoteEnabled: mockCommunitySettings.quoteEnabled,
        repostEnabled: mockCommunitySettings.repostEnabled,
        requireRuleAcceptanceBeforePost: mockCommunitySettings.requireRuleAcceptanceBeforePost,
        rulesVersion: mockCommunityRulesVersion,
        settingsVersion: mockCommunitySettings.settingsVersion,
        actorMembershipStatus: 'ACTIVE',
        actorRole: 'OWNER',
        actorHasAcceptedCurrentRules: true,
        canViewCommunity: true,
        canManageCommunity: true,
        canReviewJoinRequests: true,
        canPinPost: true,
        canPublishPost: true,
      },
    };
  }

  function mockCommunityDetailForSummary(summary: CommunitySummary): CommunityDetailView {
    if (summary.id === MOCK_COMMUNITY_ID) return mockCommunityDetail();
    const card = mockCommunityCard(summary);
    const created = mockCreatedCommunities.find((item) => item.summary.id === summary.id);
    const joined = summary.joined ?? false;
    return {
      community: {
        ...card,
        postRoleMin: 'MEMBER',
        commentRoleMin: 'VISITOR',
        quoteEnabled: true,
        repostEnabled: true,
        requireRuleAcceptanceBeforePost: false,
        rulesVersion: 1,
        settingsVersion: 1,
      },
      rules: (created?.input.rules ?? []).map((rule, index) => ({
        sortOrder: index + 1,
        content: rule,
      })),
      managers: [],
      pinnedPosts: [],
      viewerContext: {
        communityId: card.communityId,
        status: card.status,
        visibility: card.visibility,
        joinPolicy: card.joinPolicy,
        postRoleMin: 'MEMBER',
        commentRoleMin: 'VISITOR',
        quoteEnabled: true,
        repostEnabled: true,
        requireRuleAcceptanceBeforePost: false,
        rulesVersion: 1,
        settingsVersion: 1,
        actorMembershipStatus: joined ? 'ACTIVE' : 'NONE',
        actorRole: joined ? 'MEMBER' : 'VISITOR',
        actorHasAcceptedCurrentRules: joined,
        canViewCommunity: true,
        canManageCommunity: false,
        canReviewJoinRequests: false,
        canPinPost: false,
        canPublishPost: joined,
      },
    };
  }

  function mockCommunityOverview(days: 7 | 14 | 30) {
    const lastPostAtIso =
      fixtureState.posts
        .map((post) => post.createdAt)
        .sort((left, right) => right.localeCompare(left))[0] ?? null;
    return {
      snapshot: {
        communityId: MOCK_COMMUNITY_ID,
        memberCount: mockCommunityMembers.length,
        pendingJoinRequestCount: mockCommunityJoinRequests.filter(
          (request) => request.status === 'PENDING',
        ).length,
        postCount: fixtureState.posts.length,
        pinnedPostCount: mockCommunityPinnedPosts.length,
        activeManagerCount: mockCommunityMembers.filter((member) => member.role !== 'MEMBER')
          .length,
        lastPostAtIso,
        visibility: mockCommunitySettings.visibility,
        joinPolicy: mockCommunitySettings.joinPolicy,
        postRoleMin: mockCommunitySettings.postRoleMin,
        commentRoleMin: mockCommunitySettings.commentRoleMin,
      },
      daily: mockCommunityDaily.slice(-days),
    };
  }
  return {
    get mockCreatedCommunities() {
      return mockCreatedCommunities;
    },
    set mockCreatedCommunities(value: typeof mockCreatedCommunities) {
      mockCreatedCommunities = value;
    },
    allCommunitySummaries,
    mockCommunityCard,
    MOCK_COMMUNITY_ID,
    MOCK_COMMUNITY_CREATED_AT,
    mockUserPublicCard,
    mockJoinApplicantEntry,
    mockCommunityMember,
    get mockCommunitySettings() {
      return mockCommunitySettings;
    },
    set mockCommunitySettings(value: typeof mockCommunitySettings) {
      mockCommunitySettings = value;
    },
    mockCommunityProfileSnapshot,
    mockCommunitySettingsSnapshot,
    get mockCommunityRules() {
      return mockCommunityRules;
    },
    set mockCommunityRules(value: typeof mockCommunityRules) {
      mockCommunityRules = value;
    },
    get mockCommunityRulesVersion() {
      return mockCommunityRulesVersion;
    },
    set mockCommunityRulesVersion(value: typeof mockCommunityRulesVersion) {
      mockCommunityRulesVersion = value;
    },
    get mockCommunityUpdatedAtIso() {
      return mockCommunityUpdatedAtIso;
    },
    set mockCommunityUpdatedAtIso(value: typeof mockCommunityUpdatedAtIso) {
      mockCommunityUpdatedAtIso = value;
    },
    get mockCommunityMembers() {
      return mockCommunityMembers;
    },
    set mockCommunityMembers(value: typeof mockCommunityMembers) {
      mockCommunityMembers = value;
    },
    mockCommunityJoinRequests,
    get mockCommunityPinnedPosts() {
      return mockCommunityPinnedPosts;
    },
    set mockCommunityPinnedPosts(value: typeof mockCommunityPinnedPosts) {
      mockCommunityPinnedPosts = value;
    },
    mockCommunityDaily,
    get mockCommunityLogs() {
      return mockCommunityLogs;
    },
    set mockCommunityLogs(value: typeof mockCommunityLogs) {
      mockCommunityLogs = value;
    },
    addMockCommunityLog,
    mockCommunityDetail,
    mockCommunityDetailForSummary,
    mockCommunityOverview,
  };
}

export let communitiesState = createCommunitiesState();

export function resetCommunitiesState(): void {
  communitiesState = createCommunitiesState();
}
