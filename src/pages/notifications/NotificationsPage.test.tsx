import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { server } from '@/mocks/server';
import { apiSuccessResponse } from '@/test/http';
import { ToastProvider } from '@/shared/ui';
import { NotificationsPage } from './NotificationsPage';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

describe('NotificationsPage target navigation', () => {
  it('opens a notification card when the formal target resolver returns ALLOW', async () => {
    server.use(
      http.get('/api/notifications', () =>
        apiSuccessResponse({
          list: [
            {
              notificationId: 'notification-mention',
              streamSeq: '10',
              type: 'MENTIONED_IN_POST',
              category: 'MENTION',
              readAt: '2026-08-04T00:00:00.000Z',
              createdAt: '2026-08-04T00:00:00.000Z',
              primaryText: '浩然 在帖子中提及了你',
              secondaryText: '@demo_haoran',
              actor: {
                userId: 'user-haoran',
                handle: 'demo_haoran',
                displayName: '浩然',
                avatarUrl: null,
              },
              entity: null,
              masked: false,
              maskedReasonCode: null,
            },
          ],
          nextCursor: null,
          hasMore: false,
          degraded: false,
          degradedReason: null,
        }),
      ),
      http.get('/api/notifications/unread-summary', () =>
        apiSuccessResponse({
          totalUnreadCount: 0,
          mentionUnreadCount: 0,
          interactionUnreadCount: 0,
          communityUnreadCount: 0,
          systemUnreadCount: 0,
        }),
      ),
      http.get('/api/users/me/follow-requests/incoming', () =>
        apiSuccessResponse({ list: [], nextCursor: null }),
      ),
      http.get('/api/notifications/:notificationId/target', ({ params }) =>
        apiSuccessResponse({
          notificationId: String(params.notificationId),
          targetState: 'ALLOW' as const,
          entityType: 'POST',
          entityId: 'post-mention',
          targetPostId: null,
          commentId: null,
          actionUrl: '/posts/post-mention',
          maskedReasonCode: null,
        }),
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/notifications']}>
          <ToastProvider>
            <NotificationsPage />
            <LocationProbe />
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const title = await screen.findByText('浩然 在帖子中提及了你');
    const card = title.closest('[role="button"]');
    expect(card).not.toBeNull();
    fireEvent.click(card!);

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/posts/post-mention'),
    );
  });
});
