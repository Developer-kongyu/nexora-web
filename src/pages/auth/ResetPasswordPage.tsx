import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import {
  authApi,
  passwordConfirmationFieldSchema,
  passwordsMatch,
  strongPasswordSchema,
  verificationCodeSchema,
} from '@/domains/auth';
import { Button, TextField, useToast } from '@/shared/ui';
import { AuthFormShell } from './AuthFormShell';
import styles from './AuthPages.module.css';

const schema = z
  .object({
    identifier: z.string().trim().min(1, '请输入已绑定的邮箱或手机号'),
    code: verificationCodeSchema,
    password: strongPasswordSchema,
    confirmPassword: passwordConfirmationFieldSchema,
  })
  .refine(passwordsMatch, {
    path: ['confirmPassword'],
    message: '两次输入的新密码不一致',
  });

type ResetPasswordValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { showToast } = useToast();
  const resetMutation = useMutation({ mutationFn: authApi.resetPassword });
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      identifier: params.get('identifier') || '',
      code: '',
      password: '',
      confirmPassword: '',
    },
  });

  const submit = form.handleSubmit(async (values) => {
    await resetMutation.mutateAsync({
      identifier: values.identifier,
      code: values.code,
      password: values.password,
    });
    showToast({ tone: 'success', title: '密码已更新', description: '请使用新密码重新登录' });
    void navigate('/auth/login', { replace: true });
  });

  return (
    <AuthFormShell
      eyebrow="账号恢复"
      title="设置新密码"
      description="验证身份后更新密码，其他设备上的旧会话将自动失效。"
      backTo="/auth/login"
    >
      <form className={styles.form} onSubmit={submit}>
        <TextField
          label="邮箱或手机号"
          autoComplete="username"
          placeholder="name@example.com / +86"
          {...form.register('identifier')}
          error={form.formState.errors.identifier?.message}
        />
        <TextField
          label="验证码"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6 位验证码"
          maxLength={6}
          {...form.register('code')}
          error={form.formState.errors.code?.message}
        />
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
        <div className={styles.passwordRules}>
          <span>强度达到安全要求</span>
          <span>与最近密码不同</span>
        </div>
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
