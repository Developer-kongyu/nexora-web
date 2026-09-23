import { http } from 'msw';
import { ok, pageResult, cursorPage, apiError } from './http';
import { communitiesState } from '../state/communities.state';
import { fixtureState } from '../state/fixtures.state';
import { postsState } from '../state/posts.state';
import type {
  CreateCommunityInput,
  CommunityJoinRequestStatus,
  CommunityAssignableMemberRole,
  CommunityPinType,
  UpdateCommunitySettingsInput,
  UpdateCommunitySettingsField,
  CommunityModerationActionType,
} from '@/domains/communities/model';
import { mediaState } from '../state/media.state';

export const communitiesHandlers = [
  http.get('/api/communities', ({ request }) => {
    const search = new URL(request.url).searchParams;
    const page = Math.max(1, Number(search.get('page') ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(search.get('pageSize') ?? 20)));
    return ok(
      pageResult(
        communitiesState.allCommunitySummaries().map(communitiesState.mockCommunityCard),
        page,
        pageSize,
      ),
    );
  }),
  http.post('/api/communities/membership-states/_batch', async ({ request }) => {
    const body = (await request.json()) as { communityIds: string[] };
    return ok({
      list: body.communityIds.map((communityId) => {
        const summary = communitiesState
          .allCommunitySummaries()
          .find((item) => item.id === communityId);
        return summary ? { communityId, joined: summary.joined, pending: false } : null;
      }),
    });
  }),
  http.get('/api/communities/slug/:slug/posts', () =>
    ok(cursorPage(fixtureState.posts.map((post) => postsState.requiredMockPostCard(post.id)))),
  ),
  http.get('/api/communities/slug/:slug', ({ params }) => {
    const summary = communitiesState
      .allCommunitySummaries()
      .find((item) => item.slug === String(params.slug));
    return summary
      ? ok(communitiesState.mockCommunityDetailForSummary(summary))
      : apiError(404, 'COMMUNITY_NOT_FOUND', 'Community not found');
  }),
  http.get('/api/communities/:id', ({ params }) => {
    const summary = communitiesState
      .allCommunitySummaries()
      .find((item) => item.id === String(params.id));
    return summary
      ? ok(communitiesState.mockCommunityDetailForSummary(summary))
      : apiError(404, 'COMMUNITY_NOT_FOUND', 'Community not found');
  }),
  http.post('/api/communities/:id/join', ({ params }) =>
    ok({
      communityId: String(params.id),
      result: 'ALREADY_JOINED' as const,
      membershipStatus: 'ACTIVE' as const,
      joinRequestId: null,
    }),
  ),
  http.delete('/api/communities/:id/members/me', ({ params }) =>
    ok({ communityId: String(params.id), result: 'LEFT' as const }),
  ),
  http.post('/api/communities', async ({ request }) => {
    const body = (await request.json()) as Partial<CreateCommunityInput> & Record<string, unknown>;
    const allowedKeys = new Set([
      'slug',
      'name',
      'description',
      'avatarKey',
      'coverKey',
      'categoryKey',
      'tags',
      'locale',
      'regionCode',
      'joinPolicy',
      'postRoleMin',
      'commentRoleMin',
      'quoteEnabled',
      'repostEnabled',
      'requireRuleAcceptanceBeforePost',
      'rules',
    ]);
    if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
      return apiError(400, 'VALIDATION_ERROR', '社群创建请求包含未定义字段');
    }
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (slug.length < 3 || slug.length > 32 || name.length < 2 || name.length > 64) {
      return apiError(400, 'COMMUNITY_PROFILE_INVALID', '社群名称或 Slug 不合法');
    }
    if (communitiesState.allCommunitySummaries().some((item) => item.slug === slug)) {
      return apiError(409, 'COMMUNITY_SLUG_ALREADY_EXISTS', '该 Slug 已被使用');
    }
    if (
      typeof body.avatarKey === 'string' &&
      !mediaState.findReadyMockMedia(body.avatarKey, 'COMMUNITY_AVATAR')
    ) {
      return apiError(400, 'MEDIA_ASSET_STATUS_NOT_USABLE', '社群头像尚未处理完成');
    }
    if (
      typeof body.coverKey === 'string' &&
      !mediaState.findReadyMockMedia(body.coverKey, 'COMMUNITY_COVER')
    ) {
      return apiError(400, 'MEDIA_ASSET_STATUS_NOT_USABLE', '社群封面尚未处理完成');
    }

    const communityId = crypto.randomUUID();
    const input: CreateCommunityInput = {
      slug,
      name,
      description: typeof body.description === 'string' ? body.description : null,
      avatarKey: typeof body.avatarKey === 'string' ? body.avatarKey : null,
      coverKey: typeof body.coverKey === 'string' ? body.coverKey : null,
      categoryKey: typeof body.categoryKey === 'string' ? body.categoryKey : null,
      tags: Array.isArray(body.tags)
        ? body.tags.filter((item): item is string => typeof item === 'string')
        : [],
      locale: typeof body.locale === 'string' ? body.locale : null,
      regionCode: typeof body.regionCode === 'string' ? body.regionCode : null,
      joinPolicy:
        body.joinPolicy === 'APPROVAL' || body.joinPolicy === 'INVITE_ONLY'
          ? body.joinPolicy
          : 'OPEN',
      postRoleMin:
        body.postRoleMin === 'MODERATOR' ||
        body.postRoleMin === 'ADMIN' ||
        body.postRoleMin === 'OWNER'
          ? body.postRoleMin
          : 'MEMBER',
      commentRoleMin:
        body.commentRoleMin === 'MEMBER' ||
        body.commentRoleMin === 'MODERATOR' ||
        body.commentRoleMin === 'ADMIN' ||
        body.commentRoleMin === 'OWNER'
          ? body.commentRoleMin
          : 'VISITOR',
      quoteEnabled: body.quoteEnabled !== false,
      repostEnabled: body.repostEnabled !== false,
      requireRuleAcceptanceBeforePost: body.requireRuleAcceptanceBeforePost === true,
      rules: Array.isArray(body.rules)
        ? body.rules.filter((item): item is string => typeof item === 'string')
        : [],
    };
    communitiesState.mockCreatedCommunities = [
      {
        input,
        summary: {
          id: communityId,
          slug,
          name,
          description: input.description ?? '',
          avatarUrl: null,
          membersCount: 1,
          joined: true,
        },
      },
      ...communitiesState.mockCreatedCommunities,
    ];
    return ok({
      communityId,
      slug,
      ownerUserId: fixtureState.currentUser.id,
      rulesVersion: 1,
      settingsVersion: 1,
    });
  }),
  http.get('/api/communities/:id/manage/overview', ({ params, request }) => {
    if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const rawDays = Number(new URL(request.url).searchParams.get('days') ?? 7);
    const days = rawDays === 14 || rawDays === 30 ? rawDays : 7;
    return ok(communitiesState.mockCommunityOverview(days));
  }),
  http.get('/api/communities/:id/manage/join-requests', ({ params, request }) => {
    if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const search = new URL(request.url).searchParams;
    const status = (search.get('status') ?? 'PENDING') as CommunityJoinRequestStatus;
    const page = Math.max(1, Number(search.get('page') ?? 1));
    const pageSize = Math.max(1, Number(search.get('pageSize') ?? 20));
    return ok(
      pageResult(
        communitiesState.mockCommunityJoinRequests.filter((item) => item.status === status),
        page,
        pageSize,
      ),
    );
  }),
  http.post(
    '/api/communities/:id/manage/join-requests/:requestId/approve',
    async ({ params, request }) => {
      if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
        return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
      const joinRequest = communitiesState.mockCommunityJoinRequests.find(
        (item) => item.joinRequestId === String(params.requestId),
      );
      if (!joinRequest) return apiError(404, 'COMMUNITY_JOIN_REQUEST_NOT_FOUND', '加入申请不存在');
      const body = (await request.json()) as { decisionMessage?: string | null };
      if (joinRequest.status === 'APPROVED') {
        return ok({
          communityId: communitiesState.MOCK_COMMUNITY_ID,
          joinRequestId: joinRequest.joinRequestId,
          applicantUserId: joinRequest.applicantUserId,
          result: 'ALREADY_APPROVED_NOOP' as const,
        });
      }
      if (joinRequest.status !== 'PENDING')
        return apiError(409, 'COMMUNITY_JOIN_REQUEST_NOT_PENDING', '申请已被处理');

      const reviewedAtIso = new Date().toISOString();
      joinRequest.status = 'APPROVED';
      joinRequest.decisionMessage = body.decisionMessage ?? null;
      joinRequest.reviewedAtIso = reviewedAtIso;
      const alreadyMember = communitiesState.mockCommunityMembers.some(
        (member) => member.userId === joinRequest.applicantUserId,
      );
      if (!alreadyMember) {
        const card = communitiesState.mockUserPublicCard(joinRequest.applicantUserId);
        if (!card) {
          joinRequest.status = 'REJECTED';
          return ok({
            communityId: communitiesState.MOCK_COMMUNITY_ID,
            joinRequestId: joinRequest.joinRequestId,
            applicantUserId: joinRequest.applicantUserId,
            result: 'REJECTED_AS_INELIGIBLE' as const,
          });
        }
        communitiesState.mockCommunityMembers = [
          ...communitiesState.mockCommunityMembers,
          {
            userId: joinRequest.applicantUserId,
            role: 'MEMBER',
            joinedAtIso: reviewedAtIso,
            userCard: card,
          },
        ];
      }
      communitiesState.addMockCommunityLog({
        actionType: 'COMMUNITY_JOIN_REQUEST_APPROVED',
        targetUserId: joinRequest.applicantUserId,
        joinRequestId: joinRequest.joinRequestId,
        reason: body.decisionMessage ?? null,
        metadata: {
          kind: 'COMMUNITY_JOIN_REQUEST_REVIEWED',
          joinRequestId: joinRequest.joinRequestId,
          applicantUserId: joinRequest.applicantUserId,
          reviewResult: 'APPROVED',
          decisionMessage: body.decisionMessage ?? null,
          reviewReasonCode: null,
          occurredAtIso: reviewedAtIso,
        },
        createdAtIso: reviewedAtIso,
      });
      return ok({
        communityId: communitiesState.MOCK_COMMUNITY_ID,
        joinRequestId: joinRequest.joinRequestId,
        applicantUserId: joinRequest.applicantUserId,
        result: alreadyMember
          ? ('APPROVED_REQUEST_ALREADY_ACTIVE_MEMBER' as const)
          : ('APPROVED_AND_MEMBERSHIP_ACTIVATED' as const),
      });
    },
  ),
  http.post(
    '/api/communities/:id/manage/join-requests/:requestId/reject',
    async ({ params, request }) => {
      if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
        return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
      const joinRequest = communitiesState.mockCommunityJoinRequests.find(
        (item) => item.joinRequestId === String(params.requestId),
      );
      if (!joinRequest) return apiError(404, 'COMMUNITY_JOIN_REQUEST_NOT_FOUND', '加入申请不存在');
      const body = (await request.json()) as { decisionMessage?: string | null };
      if (joinRequest.status === 'REJECTED') {
        return ok({
          communityId: communitiesState.MOCK_COMMUNITY_ID,
          joinRequestId: joinRequest.joinRequestId,
          applicantUserId: joinRequest.applicantUserId,
          result: 'ALREADY_REJECTED_NOOP' as const,
        });
      }
      if (joinRequest.status !== 'PENDING')
        return apiError(409, 'COMMUNITY_JOIN_REQUEST_NOT_PENDING', '申请已被处理');

      const reviewedAtIso = new Date().toISOString();
      joinRequest.status = 'REJECTED';
      joinRequest.decisionMessage = body.decisionMessage ?? null;
      joinRequest.reviewedAtIso = reviewedAtIso;
      communitiesState.addMockCommunityLog({
        actionType: 'COMMUNITY_JOIN_REQUEST_REJECTED',
        targetUserId: joinRequest.applicantUserId,
        joinRequestId: joinRequest.joinRequestId,
        reason: body.decisionMessage ?? null,
        metadata: {
          kind: 'COMMUNITY_JOIN_REQUEST_REVIEWED',
          joinRequestId: joinRequest.joinRequestId,
          applicantUserId: joinRequest.applicantUserId,
          reviewResult: 'REJECTED',
          decisionMessage: body.decisionMessage ?? null,
          reviewReasonCode: null,
          occurredAtIso: reviewedAtIso,
        },
        createdAtIso: reviewedAtIso,
      });
      return ok({
        communityId: communitiesState.MOCK_COMMUNITY_ID,
        joinRequestId: joinRequest.joinRequestId,
        applicantUserId: joinRequest.applicantUserId,
        result: 'REJECTED' as const,
      });
    },
  ),
  http.get('/api/communities/:id/members', ({ params, request }) => {
    if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const search = new URL(request.url).searchParams;
    const role = search.get('role');
    const page = Math.max(1, Number(search.get('page') ?? 1));
    const pageSize = Math.max(1, Number(search.get('pageSize') ?? 20));
    return ok(
      pageResult(
        role
          ? communitiesState.mockCommunityMembers.filter((member) => member.role === role)
          : communitiesState.mockCommunityMembers,
        page,
        pageSize,
      ),
    );
  }),
  http.patch('/api/communities/:id/manage/members/:userId/role', async ({ params, request }) => {
    if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const member = communitiesState.mockCommunityMembers.find(
      (item) => item.userId === String(params.userId),
    );
    if (!member) return apiError(404, 'COMMUNITY_MEMBER_NOT_FOUND', '成员不存在');
    if (member.role === 'OWNER' || member.userId === fixtureState.currentUser.id)
      return apiError(403, 'COMMUNITY_MEMBER_ROLE_CHANGE_FORBIDDEN', '不能修改该成员角色');
    const body = (await request.json()) as {
      nextRole: CommunityAssignableMemberRole;
      reason?: string | null;
    };
    const previousRole = member.role;
    const result = previousRole === body.nextRole ? 'NO_CHANGE' : 'CHANGED';
    if (result === 'CHANGED') {
      member.role = body.nextRole;
      communitiesState.addMockCommunityLog({
        actionType: 'COMMUNITY_MEMBER_ROLE_CHANGED',
        targetUserId: member.userId,
        reason: body.reason ?? null,
        metadata: {
          kind: 'COMMUNITY_ROLE_CHANGED',
          targetUserId: member.userId,
          previousRole,
          nextRole: body.nextRole,
          reason: body.reason ?? null,
        },
      });
    }
    return ok({
      communityId: communitiesState.MOCK_COMMUNITY_ID,
      targetUserId: member.userId,
      previousRole,
      nextRole: body.nextRole,
      result,
    });
  }),
  http.delete('/api/communities/:id/manage/members/:userId', async ({ params, request }) => {
    if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const targetUserId = String(params.userId);
    const member = communitiesState.mockCommunityMembers.find(
      (item) => item.userId === targetUserId,
    );
    if (!member) {
      return ok({
        communityId: communitiesState.MOCK_COMMUNITY_ID,
        targetUserId,
        result: 'ALREADY_REMOVED' as const,
      });
    }
    if (member.role === 'OWNER' || targetUserId === fixtureState.currentUser.id)
      return apiError(403, 'COMMUNITY_MEMBER_REMOVE_FORBIDDEN', '不能移除该成员');
    const body = (await request.json()) as { reason?: string | null };
    communitiesState.mockCommunityMembers = communitiesState.mockCommunityMembers.filter(
      (item) => item.userId !== targetUserId,
    );
    communitiesState.addMockCommunityLog({
      actionType: 'COMMUNITY_MEMBER_REMOVED',
      targetUserId,
      reason: body.reason ?? null,
      metadata: {
        kind: 'COMMUNITY_MEMBER_CHANGED',
        targetUserId,
        changeKind: 'REMOVED',
        previousStatus: 'ACTIVE',
        nextStatus: 'REMOVED',
      },
    });
    return ok({
      communityId: communitiesState.MOCK_COMMUNITY_ID,
      targetUserId,
      result: 'REMOVED' as const,
    });
  }),
  http.get('/api/communities/:id/pinned-posts', ({ params }) =>
    String(params.id) === communitiesState.MOCK_COMMUNITY_ID
      ? ok({
          list: communitiesState.mockCommunityPinnedPosts
            .map((item) => ({
              ...item,
              postCard: postsState.mockPostCard(item.postId) ?? item.postCard,
            }))
            .sort((left, right) => left.sortOrder - right.sortOrder),
          degraded: false,
          degradedReason: null,
          filteredCountHint: 0,
        })
      : apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在'),
  ),
  http.post('/api/communities/:id/manage/pinned-posts', async ({ params, request }) => {
    if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const body = (await request.json()) as {
      postId: string;
      pinType: CommunityPinType;
      sortOrder: number;
      reason?: string | null;
    };
    const existing = communitiesState.mockCommunityPinnedPosts.find(
      (item) => item.postId === body.postId,
    );
    if (existing) {
      if (existing.pinType === body.pinType && existing.sortOrder === body.sortOrder) {
        return ok({
          communityId: communitiesState.MOCK_COMMUNITY_ID,
          postId: body.postId,
          pinType: body.pinType,
          sortOrder: body.sortOrder,
          result: 'ALREADY_PINNED' as const,
        });
      }
      return apiError(409, 'COMMUNITY_PIN_POST_ALREADY_PINNED', '帖子已在其它置顶状态');
    }
    if (communitiesState.mockCommunityPinnedPosts.some((item) => item.sortOrder === body.sortOrder))
      return apiError(409, 'COMMUNITY_PIN_SLOT_OCCUPIED', '目标置顶槽位已被占用');
    const postCard = postsState.mockPostCard(body.postId);
    if (!postCard) return apiError(404, 'COMMUNITY_PIN_POST_NOT_FOUND', '帖子不存在或不可置顶');
    const pinnedAtIso = new Date().toISOString();
    communitiesState.mockCommunityPinnedPosts = [
      ...communitiesState.mockCommunityPinnedPosts,
      {
        postId: body.postId,
        pinType: body.pinType,
        sortOrder: body.sortOrder,
        pinnedByUserId: fixtureState.currentUser.id,
        pinnedAtIso,
        postCard,
      },
    ];
    communitiesState.addMockCommunityLog({
      actionType: 'COMMUNITY_POST_PINNED',
      postId: body.postId,
      reason: body.reason ?? null,
      metadata: {
        kind: 'COMMUNITY_PINNED_POST_CHANGED',
        postId: body.postId,
        pinType: body.pinType,
        sortOrder: body.sortOrder,
        action: 'PINNED',
        reason: body.reason ?? null,
        occurredAtIso: pinnedAtIso,
      },
      createdAtIso: pinnedAtIso,
    });
    return ok({
      communityId: communitiesState.MOCK_COMMUNITY_ID,
      postId: body.postId,
      pinType: body.pinType,
      sortOrder: body.sortOrder,
      result: 'PINNED' as const,
    });
  }),
  http.patch(
    '/api/communities/:id/manage/pinned-posts/:postId/order',
    async ({ params, request }) => {
      if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
        return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
      const current = communitiesState.mockCommunityPinnedPosts.find(
        (item) => item.postId === String(params.postId),
      );
      if (!current) return apiError(404, 'COMMUNITY_PIN_POST_NOT_FOUND', '置顶帖子不存在');
      const body = (await request.json()) as { targetSortOrder: number; reason?: string | null };
      if (current.sortOrder === body.targetSortOrder) {
        return ok({
          communityId: communitiesState.MOCK_COMMUNITY_ID,
          postId: current.postId,
          sortOrder: current.sortOrder,
          swappedWithPostId: null,
        });
      }
      const previousSortOrder = current.sortOrder;
      const occupied = communitiesState.mockCommunityPinnedPosts.find(
        (item) => item.sortOrder === body.targetSortOrder,
      );
      current.sortOrder = body.targetSortOrder;
      if (occupied) occupied.sortOrder = previousSortOrder;
      const reorderedAtIso = new Date().toISOString();
      communitiesState.addMockCommunityLog({
        actionType: 'COMMUNITY_PINNED_POST_REORDERED',
        postId: current.postId,
        reason: body.reason ?? null,
        metadata: {
          kind: 'COMMUNITY_PINNED_POST_REORDERED',
          postId: current.postId,
          pinType: current.pinType,
          fromSortOrder: previousSortOrder,
          toSortOrder: body.targetSortOrder,
          swappedWithPostId: occupied?.postId ?? null,
          occurredAtIso: reorderedAtIso,
        },
        createdAtIso: reorderedAtIso,
      });
      return ok({
        communityId: communitiesState.MOCK_COMMUNITY_ID,
        postId: current.postId,
        sortOrder: current.sortOrder,
        swappedWithPostId: occupied?.postId ?? null,
      });
    },
  ),
  http.delete('/api/communities/:id/manage/pinned-posts/:postId', async ({ params, request }) => {
    if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const postId = String(params.postId);
    const existing = communitiesState.mockCommunityPinnedPosts.find(
      (item) => item.postId === postId,
    );
    if (!existing) {
      return ok({
        communityId: communitiesState.MOCK_COMMUNITY_ID,
        postId,
        result: 'ALREADY_UNPINNED' as const,
      });
    }
    const body = (await request.json()) as { reason?: string | null };
    communitiesState.mockCommunityPinnedPosts = communitiesState.mockCommunityPinnedPosts.filter(
      (item) => item.postId !== postId,
    );
    const unpinnedAtIso = new Date().toISOString();
    communitiesState.addMockCommunityLog({
      actionType: 'COMMUNITY_POST_UNPINNED',
      postId,
      reason: body.reason ?? null,
      metadata: {
        kind: 'COMMUNITY_PINNED_POST_CHANGED',
        postId,
        pinType: existing.pinType,
        sortOrder: existing.sortOrder,
        action: 'UNPINNED',
        reason: body.reason ?? null,
        occurredAtIso: unpinnedAtIso,
      },
      createdAtIso: unpinnedAtIso,
    });
    return ok({
      communityId: communitiesState.MOCK_COMMUNITY_ID,
      postId,
      result: 'UNPINNED' as const,
    });
  }),
  http.put('/api/communities/:id/rules', async ({ params, request }) => {
    if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const body = (await request.json()) as { rules: string[] };
    const canonicalRules = body.rules.map((rule) => rule.trim());
    if (
      canonicalRules.length > 10 ||
      canonicalRules.some((rule) => rule.length === 0 || rule.length > 500)
    ) {
      return apiError(400, 'COMMUNITY_RULES_INVALID', '社群规则不符合约束');
    }
    const changed =
      JSON.stringify(canonicalRules) !== JSON.stringify(communitiesState.mockCommunityRules);
    if (changed) {
      const previousRules = [...communitiesState.mockCommunityRules];
      const previousRulesVersion = communitiesState.mockCommunityRulesVersion;
      communitiesState.mockCommunityRules = canonicalRules;
      communitiesState.mockCommunityRulesVersion += 1;
      communitiesState.mockCommunityUpdatedAtIso = new Date().toISOString();
      communitiesState.addMockCommunityLog({
        actionType: 'COMMUNITY_RULES_UPDATED',
        metadata: {
          kind: 'COMMUNITY_RULES_UPDATED',
          previousRulesVersion,
          nextRulesVersion: communitiesState.mockCommunityRulesVersion,
          previousRules,
          nextRules: [...communitiesState.mockCommunityRules],
        },
        createdAtIso: communitiesState.mockCommunityUpdatedAtIso,
      });
    }
    return ok({
      communityId: communitiesState.MOCK_COMMUNITY_ID,
      rulesVersion: communitiesState.mockCommunityRulesVersion,
      ruleCount: communitiesState.mockCommunityRules.length,
      updatedAtIso: communitiesState.mockCommunityUpdatedAtIso,
    });
  }),
  http.patch('/api/communities/:id/settings', async ({ params, request }) => {
    if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const body = (await request.json()) as UpdateCommunitySettingsInput;
    const allowedKeys: UpdateCommunitySettingsField[] = [
      'visibility',
      'joinPolicy',
      'postRoleMin',
      'commentRoleMin',
      'quoteEnabled',
      'repostEnabled',
      'requireRuleAcceptanceBeforePost',
    ];
    const updatedFields = allowedKeys.filter(
      (key) => body[key] !== undefined && body[key] !== communitiesState.mockCommunitySettings[key],
    );
    if (updatedFields.length > 0) {
      const before = communitiesState.mockCommunitySettingsSnapshot();
      communitiesState.mockCommunitySettings = {
        ...communitiesState.mockCommunitySettings,
        ...body,
        settingsVersion: communitiesState.mockCommunitySettings.settingsVersion + 1,
        updatedAtIso: new Date().toISOString(),
      };
      communitiesState.mockCommunityUpdatedAtIso =
        communitiesState.mockCommunitySettings.updatedAtIso;
      communitiesState.addMockCommunityLog({
        actionType: 'COMMUNITY_SETTINGS_UPDATED',
        metadata: {
          kind: 'COMMUNITY_SETTINGS_UPDATED',
          before,
          after: communitiesState.mockCommunitySettingsSnapshot(),
          updatedFields,
        },
        createdAtIso: communitiesState.mockCommunitySettings.updatedAtIso,
      });
    }
    return ok({
      communityId: communitiesState.MOCK_COMMUNITY_ID,
      settingsVersion: communitiesState.mockCommunitySettings.settingsVersion,
      updatedAtIso: communitiesState.mockCommunitySettings.updatedAtIso,
    });
  }),
  http.get('/api/communities/:id/manage/logs', ({ params, request }) => {
    if (String(params.id) !== communitiesState.MOCK_COMMUNITY_ID)
      return apiError(404, 'COMMUNITY_NOT_FOUND', '社群不存在');
    const search = new URL(request.url).searchParams;
    const actionType = search.get('actionType') as CommunityModerationActionType | null;
    const targetUserId = search.get('targetUserId');
    const page = Math.max(1, Number(search.get('page') ?? 1));
    const pageSize = Math.max(1, Number(search.get('pageSize') ?? 20));
    const filtered = communitiesState.mockCommunityLogs.filter(
      (item) =>
        (!actionType || item.actionType === actionType) &&
        (!targetUserId || item.targetUserId === targetUserId),
    );
    return ok(pageResult(filtered, page, pageSize));
  }),
];
