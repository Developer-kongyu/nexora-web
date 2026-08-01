import type { ListNotificationsInput } from './types';

const NOTIFICATION_QUERY_ROOT = ['notifications'] as const;
const NOTIFICATION_LIST_QUERY_ROOT = [...NOTIFICATION_QUERY_ROOT, 'list'] as const;

export const notificationKeys = {
  all: NOTIFICATION_QUERY_ROOT,
  lists: () => NOTIFICATION_LIST_QUERY_ROOT,
  list: (input: ListNotificationsInput) => [...NOTIFICATION_LIST_QUERY_ROOT, input] as const,
  unread: [...NOTIFICATION_QUERY_ROOT, 'unread'] as const,
};
