import type { UserListItemView } from '@/domains/users/model';

export type FollowListRelationFilter = 'all' | 'mutual' | 'following' | 'not-following' | 'pending';
export type FollowListSort = 'newest' | 'oldest';
export function matchesFollowListRelation(
  item: UserListItemView,
  filter: FollowListRelationFilter,
): boolean {
  const relationship = item.relationship;
  if (filter === 'all') return true;
  if (filter === 'mutual') return Boolean(relationship?.following && relationship.followedBy);
  if (filter === 'following') return Boolean(relationship?.following);
  if (filter === 'pending') return Boolean(relationship?.outgoingFollowRequestPending);
  return !relationship?.following && !relationship?.outgoingFollowRequestPending;
}

function followedAtTimestamp(item: UserListItemView): number {
  if (!item.followedAt) return 0;
  const value = Date.parse(item.followedAt);
  return Number.isFinite(value) ? value : 0;
}

export function filterAndSortFollowList(
  items: UserListItemView[],
  input: {
    keyword: string;
    relation: FollowListRelationFilter;
    sort: FollowListSort;
  },
): UserListItemView[] {
  const normalizedKeyword = input.keyword.trim().toLocaleLowerCase('zh-CN');
  const filtered = items.filter((item) => {
    const matchesKeyword =
      !normalizedKeyword ||
      item.displayName.toLocaleLowerCase('zh-CN').includes(normalizedKeyword) ||
      item.handle.toLocaleLowerCase('zh-CN').includes(normalizedKeyword) ||
      item.bio?.toLocaleLowerCase('zh-CN').includes(normalizedKeyword);
    return Boolean(matchesKeyword) && matchesFollowListRelation(item, input.relation);
  });

  return [...filtered].sort((left, right) => {
    const difference = followedAtTimestamp(right) - followedAtTimestamp(left);
    return input.sort === 'newest' ? difference : -difference;
  });
}
