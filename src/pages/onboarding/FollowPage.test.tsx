import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { HttpResponse } from 'msw';
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
describe('FollowPage snapshot recovery', () => {
  it('refreshes a changed recommendation snapshot and retries with still-visible selections', async () => {
    let getCalls = 0;
    const submittedBodies: unknown[] = [];
    const recommendation = (snapshotVersion: number, userIds: string[]) => ({
      list: userIds.map((userId) => ({
        userId,
        score: 1,
        reasonCode: null,
        card: {
          userId,
          handle: userId,
          displayName: userId,
          bio: null,
          avatarUrl: null,
          followersCount: 0,
        },
      })),
      snapshotVersion,
      snapshotPayloadHash: `snapshot-hash-${snapshotVersion}`,
      submitMode: 'SNAPSHOT' as const,
      sourceSubmitToken: `snapshot-token-${snapshotVersion}`,
      submittable: true,
    });
    server.use(
      http.get('/api/auth/onboarding/recommendations/users', () => {
        getCalls += 1;
        return apiSuccessResponse(
          getCalls === 1
            ? recommendation(1, ['user-one', 'user-two', 'user-three'])
            : recommendation(2, ['user-one', 'user-three']),
        );
      }),
      http.post('/api/auth/onboarding/recommendations/users', async ({ request }) => {
        submittedBodies.push(await request.json());
        if (submittedBodies.length === 1) {
          return HttpResponse.json(
            {
              code: 'AUTH_ONBOARDING_INVALID_STATE',
              message: 'snapshot submit binding 已变化',
              data: null,
            },
            { status: 409 },
          );
        }
        return apiSuccessResponse({
          retryRequired: false,
          completedSteps: ['handle', 'interests', 'recommended-users'],
          lastStep: 'recommended-users' as const,
          nextStep: 'recommended-communities' as const,
        });
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
            <Route path="/onboarding/communities" element={<output>communities</output>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByRole('button', { name: /user-one/ });

    const nextButton = await screen.findByRole('button', { name: '下一步' });
    await waitFor(() => expect(nextButton).toBeEnabled());
    fireEvent.click(nextButton);

    expect(await screen.findByText('communities')).toBeInTheDocument();
    expect(getCalls).toBe(2);
    expect(submittedBodies).toHaveLength(2);
    expect(submittedBodies).toEqual([
      expect.objectContaining({
        selectedUserIds: ['user-one', 'user-two'],
        sourceSnapshotVersion: 1,
        sourceSnapshotPayloadHash: 'snapshot-hash-1',
      }),
      expect.objectContaining({
        selectedUserIds: ['user-one'],
        sourceSnapshotVersion: 2,
        sourceSnapshotPayloadHash: 'snapshot-hash-2',
      }),
    ]);
    expect(screen.queryByText('snapshot submit binding 已变化')).not.toBeInTheDocument();
  });
});

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
