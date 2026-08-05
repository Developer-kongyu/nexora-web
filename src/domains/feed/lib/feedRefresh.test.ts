import type { InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { PostViewModel } from '@/domains/posts/model/types';
import { mergeRefreshedFeed } from './feedRefresh';
import type { FeedPage } from '../model/types';

const post = (id: string) => ({ id }) as PostViewModel;
const page = (ids: string[], nextCursor: string | null = null): FeedPage => ({
  list: ids.map(post),
  nextCursor,
  hasMore: nextCursor !== null,
});

describe('mergeRefreshedFeed', () => {
  it('keeps the current feed when the rebuilt first page is empty', () => {
    const current: InfiniteData<FeedPage, string | undefined> = {
      pages: [page(['old-1', 'old-2'], 'old-cursor')],
      pageParams: [undefined],
    };

    expect(mergeRefreshedFeed(current, page([]))).toBe(current);
  });

  it('inserts fresh posts at the top, updates duplicates and preserves older posts', () => {
    const current: InfiniteData<FeedPage, string | undefined> = {
      pages: [page(['shared', 'old-1']), page(['old-2'])],
      pageParams: [undefined, 'old-cursor'],
    };
    const refreshed = page(['new-1', 'shared'], 'fresh-cursor');

    const merged = mergeRefreshedFeed(current, refreshed);

    expect(merged.pages).toHaveLength(1);
    expect(merged.pages[0]?.list.map((item) => item.id)).toEqual([
      'new-1',
      'shared',
      'old-1',
      'old-2',
    ]);
    expect(merged.pages[0]?.nextCursor).toBe('fresh-cursor');
  });
});
