import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MailCheck, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import {
  authApi,
  authKeys,
  clearPendingPrimaryEmail,
  readPendingPrimaryEmail,
} from '@/domains/auth';
import { Button, Card, TextField, useToast } from '@/shared/ui';
import { SettingsPage } from '../_shared/SettingsPage';
import styles from './SettingsPages.module.css';

const verificationTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function EmailIdentityVerificationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [params] = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const [email, setEmail] = useState(readPendingPrimaryEmail);

  const accountQuery = useQuery({
    queryKey: authKeys.accountSecurity,
    queryFn: authApi.accountSecurity,
  });

  const mutation = useMutation({
    mutationFn: (input: { email: string; mode: 'bind' | 'change' }) =>
      authApi.changePrimaryEmail({
        email: input.email,
        verificationToken: token,
      }),
    onSuccess: (saved, input) => {
      clearPendingPrimaryEmail();
      queryClient.setQueryData(authKeys.accountSecurity, (current) =>
        current
          ? {
              ...current,
              email: {
                value: saved.email,
                isLoginEnabled: true,
                verifiedAt: saved.verifiedAtIso,
              },
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: authKeys.accountSecurity });
      void queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      showToast({
        tone: 'success',
        title: input.mode === 'change' ? '邮箱已换绑' : '邮箱已绑定',
      });
    },
  });

  const normalizedEmail = email.trim();
  const emailValid = z.string().email().safeParse(normalizedEmail).success;
  const tokenValid = verificationTokenPattern.test(token);
  const mode = accountQuery.data?.email ? 'change' : 'bind';
  const actionLabel = mode === 'change' ? '确认换绑邮箱' : '确认绑定邮箱';

  return (
    <SettingsPage
      title="确认邮箱身份"
      description="邮箱只有在认证服务校验一次性令牌并完成主身份事务后才会更新。"
    >
      <Card className={styles.section}>
        <header>
          <span>
            <ShieldCheck size={18} />
          </span>
          <div>
            <h2>{accountQuery.data?.email ? '完成邮箱换绑' : '完成邮箱绑定'}</h2>
            <p>请输入收到确认链接的新邮箱；后端会同时校验邮箱、令牌、账号归属与有效期。</p>
          </div>
        </header>

        <div className={styles.identityVerification}>
          {mutation.isSuccess ? (
            <div className={styles.identityVerificationResult} role="status">
              <MailCheck size={24} />
              <div>
                <strong>
                  {mutation.variables?.mode === 'change' ? '邮箱换绑成功' : '邮箱绑定成功'}
                </strong>
                <p>{mutation.data.email} 已成为当前账号的主邮箱。</p>
              </div>
              <Button onClick={() => void navigate('/settings/account', { replace: true })}>
                返回账号与安全
              </Button>
            </div>
          ) : (
            <>
              {!tokenValid ? (
                <p className={styles.identityVerificationError} role="alert">
                  确认链接缺少有效令牌，请返回账号与安全页重新发送。
                </p>
              ) : null}
              {accountQuery.isError ? (
                <p className={styles.identityVerificationError} role="alert">
                  账号身份读取失败：{accountQuery.error.message}
                </p>
              ) : null}
              {mutation.isError ? (
                <p className={styles.identityVerificationError} role="alert">
                  邮箱确认失败：{mutation.error.message}
                </p>
              ) : null}
              <TextField
                label="新邮箱"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                placeholder="name@example.com"
                hint="若在另一台设备打开链接，请重新输入接收该链接的邮箱。"
                error={email.length > 0 && !emailValid ? '请输入有效的邮箱地址' : undefined}
                disabled={accountQuery.isPending || mutation.isPending}
                onChange={(event) => setEmail(event.target.value)}
              />
              <div className={styles.identityVerificationActions}>
                <Button variant="secondary" onClick={() => void navigate('/settings/account')}>
                  返回
                </Button>
                <Button
                  loading={mutation.isPending}
                  disabled={
                    !tokenValid || !emailValid || accountQuery.isPending || accountQuery.isError
                  }
                  onClick={() => mutation.mutate({ email: normalizedEmail, mode })}
                >
                  {actionLabel}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </SettingsPage>
  );
}
