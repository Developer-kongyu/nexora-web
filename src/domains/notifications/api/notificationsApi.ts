import { apiClient } from '@/shared/api/client';
import { appendQuery } from '@/shared/api/query';
import type {
  MarkNotificationsReadResult,
  ListNotificationsInput,
  NotificationDeltaResponse,
  NotificationListResponse,
  NotificationRealtimeBootstrap,
  NotificationTargetResolution,
  UnreadSummary,
} from '../model/types';

export const notificationsApi = {
  list: (input: ListNotificationsInput = {}, signal?: AbortSignal) =>
    apiClient.request<NotificationListResponse>({
      path: appendQuery('/api/notifications', {
        tab: input.tab,
        unreadOnly: input.unreadOnly,
        cursor: input.cursor,
        pageSize: input.pageSize,
      }),
      signal,
    }),

  unread: () =>
    apiClient.request<UnreadSummary>({ path: '/api/notifications/unread-summary' }),

  markRead: (notificationIds: string[]) =>
    apiClient.request<MarkNotificationsReadResult, { notificationIds: string[] }>({
      method: 'POST',
      path: '/api/notifications/read',
      body: { notificationIds },
    }),

  markAllRead: () =>
    apiClient.request<MarkNotificationsReadResult>({
      method: 'POST',
      path: '/api/notifications/read-all',
    }),

  bootstrap: () =>
    apiClient.request<NotificationRealtimeBootstrap>({
      path: '/api/notifications/realtime/bootstrap',
    }),

  delta: (afterSeq: string, limit = 100) =>
    apiClient.request<NotificationDeltaResponse>({
      path: appendQuery('/api/notifications/delta', { afterSeq, limit }),
    }),

  resolveTarget: (notificationId: string) =>
    apiClient.request<NotificationTargetResolution>({
      path: `/api/notifications/${encodeURIComponent(notificationId)}/target`,
    }),
};
