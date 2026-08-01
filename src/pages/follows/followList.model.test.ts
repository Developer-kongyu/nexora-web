import {
  resolveUserRelationshipAction,
  type UserListItemView,
  type UserRelationSnapshotView,
} from '@/domains/users/model';
import { filterAndSortFollowList, matchesFollowListRelation } from './followList.model';

function relationship(patch: Partial<UserRelationSnapshotView> = {}): UserRelationSnapshotView {
  return {
    viewerUserId: 'viewer',
    targetUserId: 'target',
    isSelf: false,
    following: false,
    followedBy: false,
    outgoingFollowRequestPending: false,
    incomingFollowRequestPending: false,
    mutePosts: false,
    muteNotifications: false,
    blockedByViewer: false,
    blockedByTarget: false,
    summary: 'NONE',
    ...patch,
  };
}

function item(
  userId: string,
  relation: UserRelationSnapshotView | null,
  followedAt: string,
): UserListItemView {
  return {
    userId,
    handle: userId,
    displayName: `用户 ${userId}`,
    bio: userId === 'alpha' ? '产品设计' : null,
    avatarUrl: null,
    relationship: relation,
    followedAt,
    followRequestId: null,
    muted: null,
    blocked: false,
  };
}

describe('follow list model', () => {
  it('resolves the only valid relationship action', () => {
    expect(resolveUserRelationshipAction(relationship())).toBe('follow');
    expect(resolveUserRelationshipAction(relationship({ following: true }))).toBe('unfollow');
    expect(
      resolveUserRelationshipAction(relationship({ outgoingFollowRequestPending: true })),
    ).toBe('cancel-request');
    expect(resolveUserRelationshipAction(relationship({ blockedByViewer: true }))).toBeNull();
    expect(resolveUserRelationshipAction(relationship({ blockedByTarget: true }))).toBeNull();
    expect(resolveUserRelationshipAction(relationship({ isSelf: true }))).toBeNull();
  });

  it('filters from the canonical relationship snapshot rather than legacy booleans', () => {
    const mutual = item(
      'mutual',
      relationship({ following: true, followedBy: true, summary: 'MUTUAL' }),
      '2026-07-28T08:00:00.000Z',
    );
    const pending = item(
      'pending',
      relationship({ outgoingFollowRequestPending: true, summary: 'REQUESTED_OUTGOING' }),
      '2026-07-27T08:00:00.000Z',
    );

    expect(matchesFollowListRelation(mutual, 'mutual')).toBe(true);
    expect(matchesFollowListRelation(mutual, 'following')).toBe(true);
    expect(matchesFollowListRelation(pending, 'pending')).toBe(true);
    expect(matchesFollowListRelation(pending, 'not-following')).toBe(false);
  });

  it('searches loaded canonical fields and sorts by followedAt', () => {
    const items = [
      item('beta', relationship(), '2026-07-27T08:00:00.000Z'),
      item('alpha', relationship(), '2026-07-28T08:00:00.000Z'),
    ];

    expect(
      filterAndSortFollowList(items, { keyword: '', relation: 'all', sort: 'newest' }).map(
        (entry) => entry.userId,
      ),
    ).toEqual(['alpha', 'beta']);
    expect(
      filterAndSortFollowList(items, {
        keyword: '产品',
        relation: 'all',
        sort: 'oldest',
      }).map((entry) => entry.userId),
    ).toEqual(['alpha']);
  });
});
