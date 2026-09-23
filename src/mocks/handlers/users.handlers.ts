import { http, HttpResponse } from 'msw';
import { ok, apiError, cursorPage, pagedMockList } from './http';
import { usersState } from '../state/users.state';
import type {
  RejectFollowRequestResult,
  CurrentUserCardView,
  BlockedUserManagementListItemView,
  FollowUserResult,
  UnfollowUserResult,
  CancelFollowRequestResult,
  UpsertUserMuteResult,
  DeleteUserRelationResult,
  BlockUserResult,
} from '@/domains/users/model';
import { fixtureState } from '../state/fixtures.state';
import { mediaState } from '../state/media.state';

export const usersHandlers = [
  http.get('/api/users/me/follow-requests/incoming', () =>
    ok({ list: usersState.mockIncomingFollowRequests, nextCursor: null }),
  ),
  http.post('/api/users/me/follow-requests/:followRequestId/approve', ({ params }) => {
    const followRequestId = String(params.followRequestId);
    const requestItem = usersState.mockIncomingFollowRequests.find(
      (item) => item.followRequestId === followRequestId,
    );
    if (!requestItem) {
      return apiError(404, 'USER_FOLLOW_REQUEST_NOT_FOUND', '关注请求不存在');
    }
    usersState.mockIncomingFollowRequests = usersState.mockIncomingFollowRequests.filter(
      (item) => item.followRequestId !== followRequestId,
    );
    const relationship = usersState.mockRelationshipByUserId(requestItem.userId);
    return ok({
      followRequestId,
      requesterUserId: requestItem.userId,
      targetUserId: requestItem.userId,
      targetState: relationship ? ('FOUND' as const) : ('TARGET_NOT_FOUND' as const),
      relationship,
    });
  }),
  http.post('/api/users/me/follow-requests/:followRequestId/reject', ({ params }) => {
    const followRequestId = String(params.followRequestId);
    const requestItem = usersState.mockIncomingFollowRequests.find(
      (item) => item.followRequestId === followRequestId,
    );
    if (!requestItem) {
      return apiError(404, 'USER_FOLLOW_REQUEST_NOT_FOUND', '关注请求不存在');
    }
    usersState.mockIncomingFollowRequests = usersState.mockIncomingFollowRequests.filter(
      (item) => item.followRequestId !== followRequestId,
    );
    const response = {
      followRequestId,
      requesterUserId: requestItem.userId,
      targetUserId: requestItem.userId,
      rejected: true as const,
    } satisfies RejectFollowRequestResult;
    return ok(response);
  }),
  http.get('/api/users/me', () => {
    const response = {
      userId: fixtureState.currentUser.id,
      handle: fixtureState.currentUser.handle,
      displayName: fixtureState.currentUser.displayName,
      avatarUrl: fixtureState.currentUser.avatarUrl,
    } satisfies CurrentUserCardView;
    return ok(response);
  }),
  http.get('/api/users/me/profile', () => ok({ ...usersState.mockEditableProfile })),
  http.patch('/api/users/me/profile', async ({ request }) => {
    const parsed = usersState.parseMockProfilePatch(await request.json());
    if (!parsed.ok) {
      const code =
        parsed.message === '资料更新内容不能为空'
          ? 'USER_EMPTY_UPDATE_PAYLOAD'
          : 'USER_PROFILE_REQUEST_VALIDATION_ERROR';
      return apiError(400, code, parsed.message);
    }
    const body = parsed.value;
    const avatarAsset =
      typeof body.avatarStorageKey === 'string'
        ? mediaState.findReadyMockMedia(body.avatarStorageKey, 'USER_AVATAR')
        : null;
    if (typeof body.avatarStorageKey === 'string' && !avatarAsset) {
      return apiError(400, 'MEDIA_ASSET_STATUS_NOT_USABLE', '用户头像尚未处理完成');
    }
    const coverAsset =
      typeof body.coverStorageKey === 'string'
        ? mediaState.findReadyMockMedia(body.coverStorageKey, 'USER_COVER')
        : null;
    if (typeof body.coverStorageKey === 'string' && !coverAsset) {
      return apiError(400, 'MEDIA_ASSET_STATUS_NOT_USABLE', '用户封面尚未处理完成');
    }

    const profile = usersState.mockUserProfiles.zhiqiu;
    if (!profile) {
      return apiError(500, 'MOCK_PROFILE_NOT_INITIALIZED', '当前用户资料夹具未初始化');
    }
    const previous = usersState.mockEditableProfile;
    const nextAvatarStorageKey =
      body.avatarStorageKey === undefined ? previous.avatarStorageKey : body.avatarStorageKey;
    const nextCoverStorageKey =
      body.coverStorageKey === undefined ? previous.coverStorageKey : body.coverStorageKey;
    const nextAvatarUrl =
      body.avatarStorageKey === undefined
        ? previous.avatarUrl
        : nextAvatarStorageKey
          ? '/media/city.svg'
          : null;
    const nextCoverUrl =
      body.coverStorageKey === undefined
        ? previous.coverUrl
        : nextCoverStorageKey
          ? '/media/coast.svg'
          : null;
    usersState.mockEditableProfile = {
      ...previous,
      displayName: body.displayName ?? previous.displayName,
      bio: body.bio !== undefined ? body.bio : previous.bio,
      location: body.location !== undefined ? body.location : previous.location,
      websiteUrl: body.websiteUrl !== undefined ? body.websiteUrl : previous.websiteUrl,
      birthday: body.birthday !== undefined ? body.birthday : previous.birthday,
      avatarStorageKey: nextAvatarStorageKey,
      coverStorageKey: nextCoverStorageKey,
      avatarUrl: nextAvatarUrl,
      coverUrl: nextCoverUrl,
      avatarMediaState:
        body.avatarStorageKey === undefined
          ? previous.avatarMediaState
          : nextAvatarStorageKey
            ? 'READY'
            : 'MISSING',
      coverMediaState:
        body.coverStorageKey === undefined
          ? previous.coverMediaState
          : nextCoverStorageKey
            ? 'READY'
            : 'MISSING',
      updatedAt: new Date().toISOString(),
    };

    const publicProfileChanged =
      profile.displayName !== usersState.mockEditableProfile.displayName ||
      profile.bio !== usersState.mockEditableProfile.bio ||
      profile.location !== usersState.mockEditableProfile.location ||
      profile.websiteUrl !== usersState.mockEditableProfile.websiteUrl ||
      profile.avatarUrl !== usersState.mockEditableProfile.avatarUrl ||
      profile.coverUrl !== usersState.mockEditableProfile.coverUrl ||
      previous.avatarStorageKey !== usersState.mockEditableProfile.avatarStorageKey ||
      previous.coverStorageKey !== usersState.mockEditableProfile.coverStorageKey;
    profile.displayName = usersState.mockEditableProfile.displayName;
    profile.bio = usersState.mockEditableProfile.bio;
    profile.location = usersState.mockEditableProfile.location;
    profile.websiteUrl = usersState.mockEditableProfile.websiteUrl;
    profile.birthday = usersState.mockEditableProfile.birthday;
    profile.avatarUrl = usersState.mockEditableProfile.avatarUrl;
    profile.coverUrl = usersState.mockEditableProfile.coverUrl;
    if (publicProfileChanged) profile.profileVersion += 1;
    fixtureState.currentUser.displayName = usersState.mockEditableProfile.displayName;
    fixtureState.currentUser.bio = usersState.mockEditableProfile.bio ?? undefined;
    fixtureState.currentUser.location = usersState.mockEditableProfile.location ?? undefined;
    fixtureState.currentUser.website = usersState.mockEditableProfile.websiteUrl ?? undefined;
    fixtureState.currentUser.avatarUrl = usersState.mockEditableProfile.avatarUrl;
    fixtureState.currentUser.coverUrl = usersState.mockEditableProfile.coverUrl;
    return ok({ ...usersState.mockEditableProfile });
  }),
  http.get('/api/users/:handle/relationship', ({ params }) => {
    const profile = usersState.mockUserProfiles[String(params.handle)];
    return profile?.relationship
      ? ok(profile.relationship)
      : new HttpResponse(null, { status: 404 });
  }),
  http.get('/api/users/:handle', ({ params }) => {
    const profile = usersState.mockUserProfiles[String(params.handle)];
    return profile ? ok(profile) : new HttpResponse(null, { status: 404 });
  }),
  http.get('/api/users/:handle/posts', () => ok(cursorPage(fixtureState.posts))),
  http.get('/api/users/:handle/followers', ({ params, request }) =>
    usersState.mockUserConnectionList(
      String(params.handle),
      request,
      usersState.mockFollowersByHandle,
    ),
  ),
  http.get('/api/users/:handle/following', ({ params, request }) =>
    usersState.mockUserConnectionList(
      String(params.handle),
      request,
      usersState.mockFollowingByHandle,
    ),
  ),
  http.get('/api/users/me/mutes', ({ request }) => {
    const list = [...usersState.mockMuteRecords]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => usersState.toManagementListItem(record.targetUserId));
    return ok(pagedMockList(request, list));
  }),
  http.get('/api/users/me/blocks', ({ request }) => {
    const list = [...usersState.mockBlockRecords]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(
        (record) =>
          ({
            ...usersState.toManagementListItem(record.targetUserId),
            canUnblock: record.canUnblock,
          }) satisfies BlockedUserManagementListItemView,
      );
    return ok(pagedMockList(request, list));
  }),
  http.post('/api/users/:handle/follow', ({ params }) => {
    const handle = String(params.handle);
    const targetNotFound = usersState.mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const profile = usersState.mockUserProfiles[handle];
    const alreadyFollowing = Boolean(profile?.relationship?.following);
    if (!alreadyFollowing) usersState.addMockFollowEdge(handle);
    const response = usersState.updateMockRelation(
      handle,
      { following: true, outgoingFollowRequestPending: false },
      alreadyFollowing ? ('ALREADY_FOLLOWING' as const) : ('FOLLOWED' as const),
    ) satisfies FollowUserResult;
    return ok(response);
  }),
  http.delete('/api/users/:handle/follow', ({ params }) => {
    const handle = String(params.handle);
    const targetNotFound = usersState.mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const profile = usersState.mockUserProfiles[handle];
    const wasFollowing = Boolean(profile?.relationship?.following);
    if (wasFollowing) usersState.removeMockFollowEdge(handle);
    const response = usersState.updateMockRelation(
      handle,
      { following: false, outgoingFollowRequestPending: false },
      wasFollowing ? ('UNFOLLOWED' as const) : ('NOOP_NOT_FOLLOWING' as const),
    ) satisfies UnfollowUserResult;
    return ok(response);
  }),
  http.delete('/api/users/:handle/follow-request', ({ params }) => {
    const handle = String(params.handle);
    const targetNotFound = usersState.mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const profile = usersState.mockUserProfiles[handle];
    const wasPending = Boolean(profile?.relationship?.outgoingFollowRequestPending);
    const response = usersState.updateMockRelation(
      handle,
      { outgoingFollowRequestPending: false },
      wasPending ? ('CANCELED' as const) : ('NOOP_NOT_PENDING' as const),
    ) satisfies CancelFollowRequestResult;
    return ok(response);
  }),
  http.put('/api/users/:handle/mute', async ({ params, request }) => {
    const handle = String(params.handle);
    const targetNotFound = usersState.mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const user = fixtureState.users.find((candidate) => candidate.handle === handle);
    const rawBody = (await request.json()) as Record<string, unknown>;
    if (typeof rawBody.mutePosts !== 'boolean' || typeof rawBody.muteNotifications !== 'boolean') {
      return apiError(400, 'USER_MUTE_REQUEST_VALIDATION_ERROR', '静音参数不合法');
    }
    const existing = user ? usersState.mockMuteByUserId(user.id) : null;
    const bothDisabled = !rawBody.mutePosts && !rawBody.muteNotifications;
    let actionResult: UpsertUserMuteResult['actionResult'];
    if (bothDisabled) {
      actionResult = 'CANCELED_BY_FALSE_FLAGS';
      if (user) {
        usersState.mockMuteRecords = usersState.mockMuteRecords.filter(
          (record) => record.targetUserId !== user.id,
        );
      }
    } else if (
      existing?.mutePosts === rawBody.mutePosts &&
      existing.muteNotifications === rawBody.muteNotifications
    ) {
      actionResult = 'NOOP_SAME_FLAGS';
    } else if (existing) {
      actionResult = 'UPDATED';
      existing.mutePosts = rawBody.mutePosts;
      existing.muteNotifications = rawBody.muteNotifications;
      existing.updatedAt = new Date().toISOString();
    } else {
      actionResult = 'CREATED';
      if (user) {
        usersState.mockMuteRecords.unshift({
          targetUserId: user.id,
          mutePosts: rawBody.mutePosts,
          muteNotifications: rawBody.muteNotifications,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    const response = usersState.updateMockRelation(
      handle,
      {
        mutePosts: bothDisabled ? false : rawBody.mutePosts,
        muteNotifications: bothDisabled ? false : rawBody.muteNotifications,
      },
      actionResult,
    ) satisfies UpsertUserMuteResult;
    return ok(response);
  }),
  http.delete('/api/users/:handle/mute', ({ params }) => {
    const handle = String(params.handle);
    const targetNotFound = usersState.mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const user = fixtureState.users.find((candidate) => candidate.handle === handle);
    const existed = Boolean(user && usersState.mockMuteByUserId(user.id));
    if (user) {
      usersState.mockMuteRecords = usersState.mockMuteRecords.filter(
        (record) => record.targetUserId !== user.id,
      );
    }
    const response = usersState.updateMockRelation(
      handle,
      { mutePosts: false, muteNotifications: false },
      existed ? ('DELETED' as const) : ('NOOP_NOT_FOUND' as const),
    ) satisfies DeleteUserRelationResult;
    return ok(response);
  }),
  http.post('/api/users/:handle/block', ({ params }) => {
    const handle = String(params.handle);
    const targetNotFound = usersState.mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const user = fixtureState.users.find((candidate) => candidate.handle === handle);
    const existed = Boolean(user && usersState.isMockBlocked(user.id));
    if (user && !existed) {
      usersState.mockBlockRecords.unshift({
        targetUserId: user.id,
        updatedAt: new Date().toISOString(),
        canUnblock: true,
      });
      usersState.mockMuteRecords = usersState.mockMuteRecords.filter(
        (record) => record.targetUserId !== user.id,
      );
      usersState.removeMockFollowEdge(handle);
    }
    const response = usersState.updateMockRelation(
      handle,
      {
        blockedByViewer: true,
        following: false,
        followedBy: false,
        outgoingFollowRequestPending: false,
        incomingFollowRequestPending: false,
        mutePosts: false,
        muteNotifications: false,
      },
      existed ? ('ALREADY_BLOCKED' as const) : ('CREATED' as const),
    ) satisfies BlockUserResult;
    return ok(response);
  }),
  http.delete('/api/users/:handle/block', ({ params }) => {
    const handle = String(params.handle);
    const targetNotFound = usersState.mockRelationTargetNotFound(handle);
    if (targetNotFound) return targetNotFound;
    const user = fixtureState.users.find((candidate) => candidate.handle === handle);
    const existed = Boolean(user && usersState.isMockBlocked(user.id));
    if (user) {
      usersState.mockBlockRecords = usersState.mockBlockRecords.filter(
        (record) => record.targetUserId !== user.id,
      );
    }
    const response = usersState.updateMockRelation(
      handle,
      { blockedByViewer: false },
      existed ? ('DELETED' as const) : ('NOOP_NOT_FOUND' as const),
    ) satisfies DeleteUserRelationResult;
    return ok(response);
  }),
];
