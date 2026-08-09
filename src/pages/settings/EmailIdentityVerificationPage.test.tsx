import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { server } from '@/mocks/server';
import { apiSuccessResponse } from '@/test/http';
import { ToastProvider } from '@/shared/ui';
import { EmailIdentityVerificationPage } from './EmailIdentityVerificationPage';

function renderPage(token: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/settings/account/email/verify?token=' + token]}>
        <ToastProvider>
          <Routes>
            <Route
              path="/settings/account/email/verify"
              element={<EmailIdentityVerificationPage />}
            />
            <Route path="/settings/account" element={<div>账号与安全</div>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EmailIdentityVerificationPage', () => {
  it('submits the link token and target email to the primary-email backend transaction', async () => {
    const token = 'a'.repeat(43);
    let mutationBody: unknown = null;

    server.use(
      http.get('/api/auth/account/security', () =>
        apiSuccessResponse({
          userId: 'user-current',
          status: 'ACTIVE' as const,
          handle: 'tester',
          email: null,
          phone: null,
          password: { configured: true, setAt: null, updatedAt: null },
        }),
      ),
      http.post('/api/auth/identities/email/change-primary', async ({ request }) => {
        mutationBody = await request.json();
        return apiSuccessResponse({
          identityId: 'email-primary',
          email: 'new@example.com',
          isPrimary: true,
          verifiedAtIso: '2026-08-09T10:00:00.000Z',
        });
      }),
    );

    window.localStorage.setItem(
      'nexora.pending-primary-email',
      JSON.stringify({ email: 'new@example.com', expiresAt: '2099-01-01T00:00:00.000Z' }),
    );
    renderPage(token);

    const submit = await screen.findByRole('button', { name: '确认绑定邮箱' });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    await waitFor(() =>
      expect(mutationBody).toEqual({
        email: 'new@example.com',
        verificationToken: token,
      }),
    );
    expect(await screen.findByText('邮箱绑定成功')).toBeInTheDocument();
    expect(window.localStorage.getItem('nexora.pending-primary-email')).toBeNull();
  });
});
