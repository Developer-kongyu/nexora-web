const PERMISSION_QUERY_ROOT = ['permissions'] as const;

export const permissionKeys = {
  all: PERMISSION_QUERY_ROOT,
  currentPolicy: [...PERMISSION_QUERY_ROOT, 'me', 'policy'] as const,
};
