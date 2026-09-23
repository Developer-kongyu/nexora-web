import { HttpResponse } from 'msw';

export const ok = <T>(data: T) => HttpResponse.json({ code: 'OK', message: 'success', data });

export const apiError = (httpStatus: number, code: string, message: string) =>
  HttpResponse.json({ code, message, data: null }, { status: httpStatus });

export const cursorPage = <T>(list: T[]) => ({ list, nextCursor: null, hasMore: false });

export function cursorPageView<T>(list: T[], request: Request) {
  const search = new URL(request.url).searchParams;
  const limit = Math.min(100, Math.max(1, Number(search.get('limit') ?? 20)));
  const rawCursor = search.get('cursor');
  const offset = rawCursor?.startsWith('offset:')
    ? Math.max(0, Number(rawCursor.slice('offset:'.length)) || 0)
    : 0;
  const page = list.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  return {
    list: page,
    nextCursor: nextOffset < list.length ? `offset:${nextOffset}` : null,
  };
}

export function pagedMockList<T>(request: Request, list: T[]) {
  const url = new URL(request.url);
  const limitValue = Number(url.searchParams.get('limit') ?? '20');
  const limit = Number.isInteger(limitValue) ? Math.min(Math.max(limitValue, 1), 50) : 20;
  const cursor = url.searchParams.get('cursor');
  const parsedOffset = cursor?.match(/^mock-offset-(\d+)$/)?.[1];
  const offset = parsedOffset ? Number(parsedOffset) : 0;
  const page = list.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  return {
    list: page,
    nextCursor: nextOffset < list.length ? `mock-offset-${nextOffset}` : null,
  };
}

export function pageResult<T>(list: T[], page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return {
    list: list.slice(offset, offset + pageSize),
    total: list.length,
    page,
    pageSize,
  };
}
