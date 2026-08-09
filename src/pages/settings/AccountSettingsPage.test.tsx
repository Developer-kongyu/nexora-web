import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { server } from '@/mocks/server';
import { apiSuccessResponse } from '@/test/http';
import { ToastProvider } from '@/shared/ui';
import { AccountSettingsPage } from './AccountSettingsPage';

function renderAccountSettingsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/settings/account']}>
        <ToastProvider>
          <Routes>
            <Route path="/settings/account" element={<AccountSettingsPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AccountSettingsPage', () => {
  it('shows an email binding entry and requests a backend change-email challenge', async () => {
    let verificationBody: unknown = null;

    server.use(
      http.get('/api/auth/account/security', () =>
        apiSuccessResponse({
          userId: 'user-current',
          status: 'ACTIVE' as const,
          handle: 'tester',
          email: null,
          phone: null,
          password: {
            configured: true,
            setAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
          },
        }),
      ),
      http.get('/api/auth/sessions', () =>
        apiSuccessResponse({ list: [], total: 0, page: 1, pageSize: 100 }),
      ),
      http.post('/api/auth/verification/email/request', async ({ request }) => {
        verificationBody = await request.json();
        return apiSuccessResponse({
          accepted: true as const,
          expiresAt: '2026-08-09T10:30:00.000Z',
        });
      }),
    );

    window.localStorage.clear();
    renderAccountSettingsPage();

    fireEvent.click(await screen.findByRole('button', { name: '绑定邮箱' }));
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送确认链接' }));

    await waitFor(() =>
      expect(verificationBody).toEqual({
        purpose: 'CHANGE_EMAIL_VERIFY',
        email: 'new@example.com',
      }),
    );
    await waitFor(() =>
      expect(window.localStorage.getItem('nexora.pending-primary-email')).toContain(
        'new@example.com',
      ),
    );
  });
  it('shows the phone binding entry and completes the verification flow', async () => {
    let verificationBody: unknown = null;
    let changePrimaryBody: unknown = null;
    let boundPhone: {
      value: string;
      isLoginEnabled: boolean;
      verifiedAt: string;
    } | null = null;

    server.use(
      http.get('/api/auth/account/security', () =>
        apiSuccessResponse({
          userId: 'user-current',
          status: 'ACTIVE' as const,
          handle: 'tester',
          email: {
            value: 'tester@example.test',
            isLoginEnabled: true,
            verifiedAt: '2026-08-09T09:00:00.000Z',
          },
          phone: boundPhone,
          password: {
            configured: true,
            setAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
          },
        }),
      ),
      http.get('/api/auth/sessions', () =>
        apiSuccessResponse({ list: [], total: 0, page: 1, pageSize: 100 }),
      ),
      http.post('/api/auth/verification/phone/request', async ({ request }) => {
        verificationBody = await request.json();
        return apiSuccessResponse({
          accepted: true as const,
          expiresAt: '2026-08-09T10:10:00.000Z',
        });
      }),
      http.post('/api/auth/identities/phone/change-primary', async ({ request }) => {
        changePrimaryBody = await request.json();
        boundPhone = {
          value: '+8613800138000',
          isLoginEnabled: true,
          verifiedAt: '2026-08-09T10:00:00.000Z',
        };
        return apiSuccessResponse({
          identityId: 'phone-identity',
          phone: boundPhone.value,
          isPrimary: true,
          verifiedAtIso: boundPhone.verifiedAt,
        });
      }),
    );

    renderAccountSettingsPage();

    expect(await screen.findByRole('button', { name: '换绑邮箱' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '绑定手机号' }));

    expect(screen.getByRole('dialog', { name: '绑定手机号' })).toBeInTheDocument();
    expect(screen.getByLabelText('短信验证码')).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('+8613800138000'), {
      target: { value: '+8613800138000' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }));

    await waitFor(() =>
      expect(verificationBody).toEqual({
        phone: '+8613800138000',
        purpose: 'CHANGE_PRIMARY_PHONE_VERIFY',
      }),
    );
    await waitFor(() => expect(screen.getByLabelText('短信验证码')).not.toBeDisabled());

    fireEvent.change(screen.getByLabelText('短信验证码'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: '确认绑定' }));

    await waitFor(() =>
      expect(changePrimaryBody).toEqual({
        phone: '+8613800138000',
        verificationCode: '123456',
      }),
    );
    expect(await screen.findByRole('button', { name: '换绑手机号' })).toBeInTheDocument();
    expect(screen.getByText(/^\+8613800138000 · 已验证于/u)).toBeInTheDocument();
  });
});
