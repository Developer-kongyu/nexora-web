import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../api/notificationsApi';
import { notificationKeys } from '../model/queryKeys';

export function useUnreadSummary() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: notificationsApi.unread,
    staleTime: 15_000,
  });
}
