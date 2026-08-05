export const FEED_TABS = ['following', 'for-you'] as const;
export type FeedTab = (typeof FEED_TABS)[number];
export const EXPLORE_POST_TABS = ['HOT', 'IMAGE', 'VIDEO'] as const;
export type ExplorePostTab = (typeof EXPLORE_POST_TABS)[number];

const FEED_QUERY_ROOT = ['feed'] as const;

export const feedKeys = {
  all: FEED_QUERY_ROOT,
  list: (tab: FeedTab) => [...FEED_QUERY_ROOT, tab] as const,
  explore: (tab: ExplorePostTab) => [...FEED_QUERY_ROOT, 'explore', 'posts', tab] as const,
  exploreTopics: (bucketKind: string) => [...FEED_QUERY_ROOT, 'explore', 'topics', bucketKind] as const,
  exploreCommunities: (bucketKind: string) => [...FEED_QUERY_ROOT, 'explore', 'communities', bucketKind] as const,
};
