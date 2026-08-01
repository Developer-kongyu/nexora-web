import type { SearchTab } from './types';

export const searchKeys = {
  all: ['search'] as const,
  results: (query: string, tab: SearchTab, sort: string) =>
    ['search', 'results', query, tab, sort] as const,
};
