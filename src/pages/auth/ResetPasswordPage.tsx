import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import {
  authApi,
  isE164Phone,
  passwordConfirmationFieldSchema,
  passwordsMatch,
  strongPasswordSchema,
} from '@/domains/auth';
import { Button, TextField, useToast } from '@/shared/ui';
import { AuthFormShell } from './AuthFormShell';
import styles from './AuthPages.module.css';
import { getPasswordResetIdentifierType } from './passwordResetFlow';

const schema = z
  .object({
    identifier: z.string().trim().optional(),
    code: z.string().trim().optional(),
    password: strongPasswordSchema,
    confirmPassword: passwordConfirmationFieldSchema,
  })
  .refine(passwordsMatch, { path: ['confirmPassword'], message: '两次输入的新密码不一致' });

type ResetPasswordValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const requestedIdentifier = params.get('identifier')?.trim() ?? '';
  const identifierType = getPasswordResetIdentifierType(requestedIdentifier);
  const isEmailPending = !token && identifierType === 'EMAIL';
  const { showToast } = useToast();
  const resetMutation = useMutation({ mutationFn: authApi.resetPassword });
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      identifier: requestedIdentifier,
      code: '',
      password: '',
      confirmPassword: '',
    },
  });

  const submit = form.handleSubmit(async (values) => {
    if (!token && !isE164Phone(values.identifier ?? '')) {
      form.setError('identifier', {
        message: '请输入有效的手机号（需含国家代码，如 +8613800138000）',
      });
      return;
    }
    if (!token && !/^\d{6}$/.test(values.code ?? '')) {
      form.setError('code', { message: '请输入 6 位数字验证码' });
      return;
    }
    await resetMutation.mutateAsync(
      token
        ? { resetType: 'LINK', token, password: values.password }
        : {
            resetType: 'CODE',
            phone: values.identifier!.trim(),
            code: values.code!,
            password: values.password,
          },
    );
    showToast({ tone: 'success', title: '密码已更新', description: '请使用新密码重新登录' });
    void navigate('/auth/login', { replace: true });
  });

  if (isEmailPending) {
    return (
      <AuthFormShell
        eyebrow="账号恢复"
        title="检查重置邮件"
        description="申请已受理。为了保护账号隐私，无论邮箱是否存在，页面都会显示相同结果。"
        backTo="/auth/login"
      >
        <div className={styles.emailResetNotice} role="status">
          <MailCheck size={22} />
          <span>
            <strong>请查看 {requestedIdentifier}</strong>
            <small>
              若该邮箱已绑定账号，重置链接会发送到账号的主恢复邮箱。请从邮件链接继续设置新密码。
            </small>
          </span>
        </div>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      eyebrow="账号恢复"
      title="设置新密码"
      description={
        token
          ? '正在使用邮件重置链接更新密码。'
          : '收到短信验证码后，输入绑定手机号、验证码和新密码。若收到邮件，请直接使用邮件中的重置链接。'
      }
      backTo="/auth/login"
      status={
        !token && requestedIdentifier
          ? '重置申请已受理。若账号有效，重置指引会发送到账号的主恢复方式。'
          : undefined
      }
    >
      <form className={styles.form} onSubmit={submit}>
        {!token ? (
          <>
            <TextField
              label="手机号"
              autoComplete="tel"
              placeholder="+8613800138000"
              {...form.register('identifier')}
              error={form.formState.errors.identifier?.message}
            />
            <TextField
              label="短信验证码"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6 位验证码"
              maxLength={6}
              {...form.register('code')}
              error={form.formState.errors.code?.message}
            />
          </>
        ) : null}
        <TextField
          label="新密码"
          type="password"
          autoComplete="new-password"
          placeholder="至少 8 位，包含字母和数字"
          {...form.register('password')}
          error={form.formState.errors.password?.message}
        />
        <TextField
          label="确认新密码"
          type="password"
          autoComplete="new-password"
          placeholder="再次输入新密码"
          {...form.register('confirmPassword')}
          error={form.formState.errors.confirmPassword?.message}
        />
        {resetMutation.error ? (
          <p className={styles.error} role="alert">
            {resetMutation.error.message}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          loading={resetMutation.isPending}
          className={styles.wideButton}
        >
          确认修改
        </Button>
      </form>
    </AuthFormShell>
  );
}
