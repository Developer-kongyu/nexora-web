import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { server } from '@/mocks/server';
import { apiSuccessResponse } from '@/test/http';
import { ToastProvider } from '@/shared/ui';
import { ProfileEditPage } from './ProfileEditPage';

const editableProfile = {
  userId: 'user-current',
  displayName: '林知夏',
  bio: '产品设计师',
  location: '上海',
  websiteUrl: 'https://example.com',
  birthday: '1995-04-18',
  avatarStorageKey: null,
  coverStorageKey: null,
  avatarUrl: null,
  coverUrl: null,
  avatarMediaState: 'MISSING' as const,
  coverMediaState: 'MISSING' as const,
  updatedAt: '2026-08-09T10:00:00.000Z',
};

function renderProfileEditPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ToastProvider>
          <ProfileEditPage />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function changeDisplayNameAndSave(value: string) {
  fireEvent.change(await screen.findByLabelText('昵称'), { target: { value } });
  const saveButton = screen.getByRole('button', { name: '保存更改' });
  await waitFor(() => expect(saveButton).toBeEnabled());
  fireEvent.click(saveButton);
}

describe('ProfileEditPage save feedback', () => {
  it('removes the persistent save-result card and opens a success dialog after the backend saves', async () => {
    let requestBody: unknown = null;
    server.use(
      http.get('/api/users/me/profile', () => apiSuccessResponse(editableProfile)),
      http.patch('/api/users/me/profile', async ({ request }) => {
        requestBody = await request.json();
        return apiSuccessResponse({
          ...editableProfile,
          displayName: '林知夏 Pro',
          updatedAt: '2026-08-09T10:05:00.000Z',
        });
      }),
    );

    renderProfileEditPage();

    expect(screen.queryByText('保存结果')).not.toBeInTheDocument();
    await changeDisplayNameAndSave('林知夏 Pro');

    await waitFor(() => expect(requestBody).toMatchObject({ displayName: '林知夏 Pro' }));
    const dialog = await screen.findByRole('dialog', { name: '个人资料已保存' });
    expect(within(dialog).getByText(/服务端返回结果同步更新/u)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: '知道了' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '个人资料已保存' })).not.toBeInTheDocument(),
    );
  });

  it('opens an error dialog when the backend rejects the save', async () => {
    server.use(
      http.get('/api/users/me/profile', () => apiSuccessResponse(editableProfile)),
      http.patch('/api/users/me/profile', () =>
        HttpResponse.json(
          { code: 'USER_PROFILE_REQUEST_VALIDATION_ERROR', message: '服务端拒绝保存' },
          { status: 400 },
        ),
      ),
    );

    renderProfileEditPage();
    await changeDisplayNameAndSave('新的昵称');

    const dialog = await screen.findByRole('dialog', { name: '资料保存失败' });
    expect(within(dialog).getByText('服务端拒绝保存')).toBeInTheDocument();
  });

  it('shows a validation dialog without calling the backend for invalid fields', async () => {
    let patchCalled = false;
    server.use(
      http.get('/api/users/me/profile', () => apiSuccessResponse(editableProfile)),
      http.patch('/api/users/me/profile', () => {
        patchCalled = true;
        return apiSuccessResponse(editableProfile);
      }),
    );

    renderProfileEditPage();
    await changeDisplayNameAndSave('');

    const dialog = await screen.findByRole('dialog', { name: '字段校验失败' });
    expect(within(dialog).getByText(/请修正表单/u)).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });
});
