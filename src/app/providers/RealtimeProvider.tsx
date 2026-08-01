import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectNotificationSocket, notificationKeys } from '@/domains/notifications';
import { useAuthStore } from '@/domains/auth';

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const client = useQueryClient();
  useEffect(() => {
    if (status !== 'authenticated') return;

    let disposed = false;
    let disconnect: (() => void) | null = null;
    const connection = connectNotificationSocket(() => {
      void client.invalidateQueries({ queryKey: notificationKeys.all });
    });

    void connection
      .then((nextDisconnect) => {
        if (disposed) {
          nextDisconnect();
          return;
        }
        disconnect = nextDisconnect;
      })
      .catch((error: unknown) => {
        if (!disposed) console.error('Notification realtime connection failed.', error);
      });

    return () => {
      disposed = true;
      disconnect?.();
    };
  }, [client, status]);
  return children;
}
