import { http } from 'msw';
import { notificationsState } from '../state/notifications.state';
import { ok } from './http';

export const notificationsHandlers = [
  http.get('/api/notifications', ({ request }) => {
    const url = new URL(request.url);
    const tab = url.searchParams.get('tab') ?? 'ALL';
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const list = notificationsState.mockNotifications.filter((item) => {
      if (unreadOnly && item.readAt) return false;
      if (tab === 'MENTIONS') return item.category === 'MENTION';
      if (tab === 'INTERACTIONS') return item.category === 'INTERACTION';
      if (tab === 'COMMUNITIES') return item.category === 'COMMUNITY';
      if (tab === 'SYSTEM') return item.category === 'SYSTEM';
      return true;
    });
    return ok({
      list,
      nextCursor: null,
      hasMore: false,
      degraded: false,
      degradedReason: null,
    });
  }),
  http.get('/api/notifications/unread-summary', () =>
    ok(notificationsState.calculateUnreadSummary()),
  ),
  http.post('/api/notifications/read', async ({ request }) => {
    const body = (await request.json()) as { notificationIds: string[] };
    const readAt = new Date().toISOString();
    let updatedCount = 0;
    notificationsState.mockNotifications = notificationsState.mockNotifications.map((item) => {
      if (!body.notificationIds.includes(item.notificationId) || item.readAt) return item;
      updatedCount += 1;
      return { ...item, readAt };
    });
    return ok({ updatedCount, lastReadAt: readAt });
  }),
  http.post('/api/notifications/read-all', () => {
    const readAt = new Date().toISOString();
    let updatedCount = 0;
    notificationsState.mockNotifications = notificationsState.mockNotifications.map((item) => {
      if (item.readAt) return item;
      updatedCount += 1;
      return { ...item, readAt };
    });
    return ok({ updatedCount, lastReadAt: readAt });
  }),
  http.get('/api/notifications/realtime/bootstrap', () =>
    ok({
      summary: notificationsState.calculateUnreadSummary(),
      latestSeq: notificationsState.mockNotifications[0]?.streamSeq ?? '0',
    }),
  ),
  http.get('/api/notifications/delta', ({ request }) => {
    const afterSeq = new URL(request.url).searchParams.get('afterSeq') ?? '0';
    const list = notificationsState.mockNotifications.filter(
      (item) => Number(item.streamSeq) > Number(afterSeq),
    );
    return ok({
      list,
      latestSeq: notificationsState.mockNotifications[0]?.streamSeq ?? afterSeq,
      hasGap: false,
    });
  }),
  http.get('/api/notifications/:notificationId/target', ({ params }) => {
    const item = notificationsState.mockNotifications.find(
      (candidate) => candidate.notificationId === String(params.notificationId),
    );
    const available = Boolean(item?.entity?.actionUrl);
    return ok({
      notificationId: String(params.notificationId),
      targetState: available ? ('ALLOW' as const) : ('MASKED' as const),
      entityType: available ? (item?.entity?.entityType ?? null) : null,
      entityId: available ? (item?.entity?.entityId ?? null) : null,
      targetPostId: null,
      commentId: null,
      actionUrl: item?.entity?.actionUrl ?? null,
      maskedReasonCode: available ? null : 'TARGET_PERMISSION_DENIED',
    });
  }),
];
