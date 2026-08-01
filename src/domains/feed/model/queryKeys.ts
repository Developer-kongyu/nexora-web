export const FEED_TABS = ['following', 'for-you'] as const;
export type FeedTab = (typeof FEED_TABS)[number];

const FEED_QUERY_ROOT = ['feed'] as const;

export const feedKeys = {
  all: FEED_QUERY_ROOT,
  list: (tab: FeedTab) => [...FEED_QUERY_ROOT, tab] as const,
  explore: [...FEED_QUERY_ROOT, 'explore'] as const,
};
