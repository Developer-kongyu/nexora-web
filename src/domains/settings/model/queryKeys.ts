const SETTINGS_QUERY_ROOT = ['settings'] as const;

export const settingsKeys = {
  all: SETTINGS_QUERY_ROOT,
  overview: [...SETTINGS_QUERY_ROOT, 'overview'] as const,
  notifications: [...SETTINGS_QUERY_ROOT, 'notifications'] as const,
  recommendation: [...SETTINGS_QUERY_ROOT, 'recommendation'] as const,
  search: [...SETTINGS_QUERY_ROOT, 'search'] as const,
  interests: [...SETTINGS_QUERY_ROOT, 'interests'] as const,
  interestCatalog: [...SETTINGS_QUERY_ROOT, 'interests', 'catalog'] as const,
};
