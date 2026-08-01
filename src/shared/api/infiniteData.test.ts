import { describe, expect, it } from 'vitest';
import type { InfiniteData } from '@tanstack/react-query';
import { requireArrayItem } from '@/shared/lib/array';
import {
  filterInfiniteDataItems,
  mergeInfiniteDataItemsBy,
  removeInfiniteDataItemsByKey,
} from './infiniteData';

interface Page {
  list: Array<{ id: string }>;
  nextCursor: string | null;
}

const source: InfiniteData<Page, string | undefined> = {
  pages: [
    { list: [{ id: 'a' }, { id: 'b' }], nextCursor: 'next' },
    { list: [{ id: 'c' }], nextCursor: null },
  ],
  pageParams: [undefined, 'next'],
};

describe('InfiniteData list helpers', () => {
  it('filters each page without changing pagination metadata', () => {
    const filtered = filterInfiniteDataItems(source, (item) => item.id !== 'b');
    expect(filtered?.pages.map((page) => page.list.map((item) => item.id))).toEqual([['a'], ['c']]);
    expect(filtered?.pageParams).toEqual(source.pageParams);
    expect(requireArrayItem(source.pages, 0, 'source page').list.map((item) => item.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('removes selected keys across pages', () => {
    const filtered = removeInfiniteDataItemsByKey(source, new Set(['a', 'c']), (item) => item.id);
    expect(filtered?.pages.map((page) => page.list.map((item) => item.id))).toEqual([['b'], []]);
  });

  it('merges pages and keeps the first item for each key', () => {
    const duplicated: InfiniteData<Page, string | undefined> = {
      pages: [
        requireArrayItem(source.pages, 0, 'source page'),
        { list: [{ id: 'b' }, { id: 'c' }], nextCursor: null },
      ],
      pageParams: source.pageParams,
    };

    expect(mergeInfiniteDataItemsBy(duplicated, (item) => item.id)).toEqual([
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
    ]);
  });
});
