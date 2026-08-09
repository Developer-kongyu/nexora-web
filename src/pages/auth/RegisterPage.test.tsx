import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { server } from '@/mocks/server';
import { apiSuccessResponse } from '@/test/http';
import { ToastProvider } from '@/shared/ui';
import { RegisterPage } from './RegisterPage';

function renderRegisterPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/auth/register']}>
        <ToastProvider>
          <Routes>
            <Route path="/auth/register" element={<RegisterPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RegisterPage', () => {
  it('switches to phone registration and requests a registration verification code', async () => {
    let submittedBody: unknown = null;
    server.use(
      http.post('/api/auth/verification/phone/request', async ({ request }) => {
        submittedBody = await request.json();
        return apiSuccessResponse({
          accepted: true as const,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });
      }),
    );

    renderRegisterPage();

    expect(screen.getByRole('button', { name: '邮箱注册' })).toBeInTheDocument();
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '手机号注册' }));

    expect(screen.getByLabelText('手机号')).toBeInTheDocument();
    expect(screen.getByLabelText('验证码')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('手机号'), {
      target: { value: '+8613800138000' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }));

    await waitFor(() =>
      expect(submittedBody).toEqual({
        purpose: 'REGISTER_PHONE_VERIFY',
        phone: '+8613800138000',
      }),
    );
    expect(await screen.findByRole('button', { name: /\d+s/ })).toBeDisabled();
    expect(screen.getByText('验证码已发送')).toBeInTheDocument();
  });
});
