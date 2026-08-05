import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { onboardingPathForStatus, useCompleteGoogleProfile } from '@/domains/auth';
import { Button, TextField, useToast } from '@/shared/ui';
import { AuthFormShell } from './AuthFormShell';
import styles from './AuthPages.module.css';

const schema = z.object({
  handle: z
    .string()
    .trim()
    .min(3, 'Handle 至少 3 个字符')
    .max(24, 'Handle 最多 24 个字符')
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'Handle 需以字母开头，仅支持字母、数字与下划线'),
});

type GoogleCompleteValues = z.infer<typeof schema>;

function readPendingGoogleProfile(params: URLSearchParams) {
  const fromQuery = {
    pendingUserId: params.get('pendingUserId'),
    completionToken: params.get('completionToken'),
  };
  if (fromQuery.pendingUserId && fromQuery.completionToken) return fromQuery;
  try {
    const stored = JSON.parse(sessionStorage.getItem('google-profile-completion') ?? 'null') as {
      pendingUserId?: string;
      completionToken?: string;
    } | null;
    return {
      pendingUserId: stored?.pendingUserId ?? null,
      completionToken: stored?.completionToken ?? null,
    };
  } catch {
    return fromQuery;
  }
}

export function GoogleCompletePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [flowError, setFlowError] = useState<string | null>(null);
  const { showToast } = useToast();
  const completeProfile = useCompleteGoogleProfile();
  const pending = readPendingGoogleProfile(params);
  const form = useForm<GoogleCompleteValues>({
    resolver: zodResolver(schema),
    defaultValues: { handle: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    if (!pending.pendingUserId || !pending.completionToken) {
      setFlowError('Google 登录上下文已缺失或过期，请返回登录页重新验证 Google 账号。');
      return;
    }
    const session = await completeProfile.mutateAsync({
      pendingUserId: pending.pendingUserId,
      completionToken: pending.completionToken,
      handle: values.handle,
    });
    sessionStorage.removeItem('google-profile-completion');
    showToast({ tone: 'success', title: 'Google 账号资料已完成' });
    void navigate(onboardingPathForStatus(session.onboardingStatus) ?? '/home', { replace: true });
  });

  return (
    <AuthFormShell
      eyebrow="首次登录"
      title="选择公开 Handle"
      description="Google 资料已经由服务端验证；这里只需选择站内唯一 Handle。"
      backTo="/auth/login"
    >
      <form className={styles.form} onSubmit={submit}>
        <TextField
          label="Handle"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="例如 zhiqiu"
          hint="以字母开头，仅支持字母、数字与下划线"
          {...form.register('handle')}
          error={form.formState.errors.handle?.message}
        />
        {flowError || completeProfile.error ? (
          <p className={styles.error} role="alert">
            {flowError ?? completeProfile.error?.message}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          loading={completeProfile.isPending}
          className={styles.wideButton}
        >
          完成并继续
        </Button>
      </form>
    </AuthFormShell>
  );
}
