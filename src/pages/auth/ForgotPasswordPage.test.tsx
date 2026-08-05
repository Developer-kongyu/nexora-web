import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { server } from '@/mocks/server';
import { apiSuccessResponse } from '@/test/http';
import { ToastProvider } from '@/shared/ui';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

describe('ForgotPasswordPage', () => {
  it('automatically enters the email reset state after the request is accepted', async () => {
    let submittedIdentifier = '';
    server.use(
      http.post('/api/auth/password/reset/request', async ({ request }) => {
        const body = (await request.json()) as { loginIdentifier: string };
        submittedIdentifier = body.loginIdentifier;
        return apiSuccessResponse({ requested: true as const });
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/auth/password/forgot']}>
          <ToastProvider>
            <Routes>
              <Route path="/auth/password/forgot" element={<ForgotPasswordPage />} />
              <Route
                path="/auth/password/reset"
                element={
                  <>
                    <ResetPasswordPage />
                    <LocationProbe />
                  </>
                }
              />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('邮箱或手机号'), {
      target: { value: 'name+tag@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送重置指引' }));

    await waitFor(() => expect(submittedIdentifier).toBe('name+tag@example.com'));
    expect(await screen.findByText('检查重置邮件')).toBeInTheDocument();
    expect(screen.queryByLabelText('手机号')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/auth/password/reset?identifier=name%2Btag%40example.com',
    );
  });

  it('automatically opens the SMS code form for a phone identifier', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/auth/password/forgot']}>
          <ToastProvider>
            <Routes>
              <Route path="/auth/password/forgot" element={<ForgotPasswordPage />} />
              <Route path="/auth/password/reset" element={<ResetPasswordPage />} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('邮箱或手机号'), {
      target: { value: '+8613800138000' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送重置指引' }));

    expect(await screen.findByLabelText('手机号')).toHaveValue('+8613800138000');
    expect(screen.getByLabelText('短信验证码')).toBeInTheDocument();
    expect(screen.queryByText('继续验证并设置新密码')).not.toBeInTheDocument();
  });
});
