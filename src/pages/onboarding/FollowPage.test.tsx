import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/domains/auth';
import { server } from '@/mocks/server';
import { apiSuccessResponse } from '@/test/http';
import { FollowPage } from './FollowPage';

const currentUser = {
  id: 'user-current',
  handle: 'tester',
  displayName: 'Tester',
  avatarUrl: null,
};

afterEach(() => useAuthStore.getState().setAnonymous());

describe('FollowPage', () => {
  it('uses the formal onboarding skip endpoint when no recommendation snapshot is submittable', async () => {
    let skipCalls = 0;
    server.use(
      http.get('/api/auth/onboarding/recommendations/users', () =>
        apiSuccessResponse({
          list: [],
          snapshotVersion: null,
          snapshotPayloadHash: null,
          submitMode: 'NONE' as const,
          sourceSubmitToken: null,
          submittable: false,
        }),
      ),
      http.post('/api/auth/onboarding/skip', () => {
        skipCalls += 1;
        return apiSuccessResponse({ onboardingStatus: 'SKIPPED' as const });
      }),
    );
    useAuthStore.setState({
      status: 'authenticated',
      user: currentUser,
      onboardingCompleted: false,
      onboardingStatus: 'PENDING_RECOMMENDED_USERS',
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/onboarding/follow']}>
          <Routes>
            <Route path="/onboarding/follow" element={<FollowPage />} />
            <Route path="/home" element={<output>home</output>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const skipButton = await screen.findByRole('button', { name: '跳过' });
    await waitFor(() => expect(skipButton).toBeEnabled());
    fireEvent.click(skipButton);

    expect(await screen.findByText('home')).toBeInTheDocument();
    expect(skipCalls).toBe(1);
    await waitFor(() => expect(useAuthStore.getState().onboardingStatus).toBe('SKIPPED'));
    expect(
      screen.queryByText('候选账号与提交令牌均来自后端当前推荐快照。'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('只提交当前后端返回的候选 ID')).not.toBeInTheDocument();
    expect(screen.queryByText('提交失败时不会跳过当前步骤')).not.toBeInTheDocument();
    expect(screen.queryByText('以后仍可在设置中调整兴趣与关系')).not.toBeInTheDocument();
  });
});
