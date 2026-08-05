import type { InfiniteData } from '@tanstack/react-query';
import type { FeedPage } from '../model/types';

export type FeedInfiniteData = InfiniteData<FeedPage, string | undefined>;

/**
 * Commits a rebuilt first page without making already visible posts disappear.
 * Fresh copies win so counters and viewer state are updated, while older items
 * remain below them. The refreshed cursor becomes the source of future pages.
 */
export function mergeRefreshedFeed(
  current: FeedInfiniteData | undefined,
  refreshed: FeedPage,
): FeedInfiniteData {
  if (!current) {
    return { pages: [refreshed], pageParams: [undefined] };
  }

  if (refreshed.list.length === 0) return current;

  const seen = new Set<string>();
  const list = [...refreshed.list, ...current.pages.flatMap((page) => page.list)].filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });

  return {
    pages: [{ ...refreshed, list }],
    pageParams: [undefined],
  };
}
