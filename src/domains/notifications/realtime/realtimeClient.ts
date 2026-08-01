import { io, type Socket } from 'socket.io-client';
import { env } from '@/shared/config/env';
import { notificationsApi } from '../api/notificationsApi';

export async function connectNotificationSocket(onChanged: () => void): Promise<() => void> {
  if (!env.VITE_SOCKET_URL) return () => undefined;

  const bootstrap = await notificationsApi.bootstrap();
  const socket: Socket = io(env.VITE_SOCKET_URL, {
    auth: { latestSeq: bootstrap.latestSeq },
    withCredentials: true,
    transports: ['websocket'],
  });

  socket.on('notification:new', onChanged);
  socket.on('notifications:changed', onChanged);

  return () => {
    socket.off('notification:new', onChanged);
    socket.off('notifications:changed', onChanged);
    socket.disconnect();
  };
}
