import type { NotificationItem, UnreadSummary } from '@/domains/notifications/model';
import { fixtureState } from './fixtures.state';

function createNotificationsState() {
  let mockNotifications: NotificationItem[] = fixtureState.notifications.map((item) => ({
    ...item,
  }));

  function calculateUnreadSummary(): UnreadSummary {
    const unreadItems = mockNotifications.filter((item) => !item.readAt);
    return {
      totalUnreadCount: unreadItems.length,
      mentionUnreadCount: unreadItems.filter((item) => item.category === 'MENTION').length,
      interactionUnreadCount: unreadItems.filter((item) => item.category === 'INTERACTION').length,
      communityUnreadCount: unreadItems.filter((item) => item.category === 'COMMUNITY').length,
      systemUnreadCount: unreadItems.filter((item) => item.category === 'SYSTEM').length,
    };
  }
  return {
    get mockNotifications() {
      return mockNotifications;
    },
    set mockNotifications(value: typeof mockNotifications) {
      mockNotifications = value;
    },
    calculateUnreadSummary,
  };
}

export let notificationsState = createNotificationsState();

export function resetNotificationsState(): void {
  notificationsState = createNotificationsState();
}
