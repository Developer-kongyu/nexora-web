import { describe, expect, it } from 'vitest';
import {
  appendCursorQuery,
  buildCursorQuery,
  getNextCursorPageParam,
  mergeCursorItems,
  mergeCursorItemsBy,
} from './pagination';

describe('cursor pagination helpers', () => {
  it('builds cursor query strings without empty parameters', () => {
    expect(buildCursorQuery()).toBe('');
    expect(buildCursorQuery({ cursor: 'next value', limit: 20 })).toBe(
      '?cursor=next+value&limit=20',
    );
    expect(appendCursorQuery('/api/items?state=active', { limit: 10 })).toBe(
      '/api/items?state=active&limit=10',
    );
  });

  it('maps a nullable cursor to the React Query page parameter contract', () => {
    expect(getNextCursorPageParam({ nextCursor: 'next' })).toBe('next');
    expect(getNextCursorPageParam({ nextCursor: null })).toBeUndefined();
  });

  it('merges cursor pages while preserving first-seen order', () => {
    const pages = [
      { list: [{ id: '1' }, { id: '2' }], nextCursor: 'next' },
      { list: [{ id: '2' }, { id: '3' }], nextCursor: null },
    ];
    expect(mergeCursorItems(pages).map((item) => item.id)).toEqual(['1', '2', '3']);
    expect(
      mergeCursorItemsBy(
        [
          { list: [{ key: 'a' }, { key: 'b' }], nextCursor: 'next' },
          { list: [{ key: 'b' }, { key: 'c' }], nextCursor: null },
        ],
        (item) => item.key,
      ).map((item) => item.key),
    ).toEqual(['a', 'b', 'c']);
  });
});
