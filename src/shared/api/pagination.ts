import { appendQuery, buildQueryString } from './query';
import { uniqueItemsBy } from '@/shared/lib/set';

export interface CursorRequest {
  cursor?: string | null;
  limit?: number;
}

export interface CursorPageView<T> {
  list: T[];
  nextCursor: string | null;
}

/**
 * Legacy cursor response that includes a server-supplied hasMore flag.
 * New endpoints should prefer CursorPageView and infer continuation from nextCursor.
 */
export interface CursorPage<T> extends CursorPageView<T> {
  hasMore: boolean;
}

export function buildCursorQuery(request: CursorRequest = {}): string {
  const query = buildQueryString({ cursor: request.cursor, limit: request.limit });
  return query ? `?${query}` : '';
}

export function appendCursorQuery(path: string, request: CursorRequest = {}): string {
  return appendQuery(path, { cursor: request.cursor, limit: request.limit });
}

export function getNextCursorPageParam(
  page: Pick<CursorPageView<unknown>, 'nextCursor'>,
): string | undefined {
  return page.nextCursor ?? undefined;
}

export function mergeCursorItems<T extends { id: string }>(pages: CursorPageView<T>[]): T[] {
  return mergeCursorItemsBy(pages, (item) => item.id);
}

export function mergeCursorItemsBy<T>(
  pages: CursorPageView<T>[],
  getKey: (item: T) => string,
): T[] {
  return uniqueItemsBy(
    pages.flatMap((page) => page.list),
    getKey,
  );
}
