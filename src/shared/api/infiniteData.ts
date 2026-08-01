import type { InfiniteData } from '@tanstack/react-query';
import { uniqueItemsBy } from '@/shared/lib/set';

export interface InfiniteListPage<TItem> {
  list: TItem[];
}

type InfiniteListItem<TPage extends InfiniteListPage<unknown>> =
  TPage extends InfiniteListPage<infer TItem> ? TItem : never;

export function filterInfiniteDataItems<
  TPage extends InfiniteListPage<unknown>,
  TPageParam = unknown,
>(
  data: InfiniteData<TPage, TPageParam> | undefined,
  predicate: (item: InfiniteListItem<TPage>) => boolean,
): InfiniteData<TPage, TPageParam> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      list: page.list.filter((item) => predicate(item as InfiniteListItem<TPage>)),
    })),
  };
}

export function removeInfiniteDataItemsByKey<
  TPage extends InfiniteListPage<unknown>,
  TPageParam = unknown,
>(
  data: InfiniteData<TPage, TPageParam> | undefined,
  removedKeys: ReadonlySet<string>,
  getKey: (item: InfiniteListItem<TPage>) => string,
): InfiniteData<TPage, TPageParam> | undefined {
  if (!removedKeys.size) return data;
  return filterInfiniteDataItems(data, (item) => !removedKeys.has(getKey(item)));
}

export function mergeInfiniteDataItemsBy<
  TPage extends InfiniteListPage<unknown>,
  TPageParam = unknown,
>(
  data: InfiniteData<TPage, TPageParam> | undefined,
  getKey: (item: InfiniteListItem<TPage>) => string,
): InfiniteListItem<TPage>[] {
  if (!data) return [];
  const items = data.pages.flatMap((page) => page.list as InfiniteListItem<TPage>[]);
  return uniqueItemsBy(items, getKey);
}
