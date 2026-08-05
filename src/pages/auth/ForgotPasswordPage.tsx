import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '@/domains/auth';
import { paths } from '@/shared/config/paths';
import { Button, TextField } from '@/shared/ui';
import { AuthFormShell } from './AuthFormShell';
import styles from './AuthPages.module.css';
import { validatePasswordResetIdentifier } from './passwordResetFlow';

const schema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, '请输入已绑定的邮箱或手机号')
    .refine((value) => validatePasswordResetIdentifier(value) === true, {
      message: '请输入有效的邮箱或手机号（手机号需含国家代码，如 +8613800138000）',
    }),
});

type ForgotPasswordValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const requestReset = useMutation({ mutationFn: authApi.requestPasswordReset });
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    const identifier = values.identifier.trim();
    await requestReset.mutateAsync({ identifier });
    void navigate(paths.passwordResetFor(identifier), { replace: true });
  });

  return (
    <AuthFormShell
      eyebrow="账号恢复"
      title="找回密码"
      description="输入已绑定的邮箱或手机号。系统会按账号的主恢复方式发送重置链接或 6 位验证码。"
      backTo="/auth/login"
    >
      <form className={styles.form} onSubmit={submit}>
        <TextField
          label="邮箱或手机号"
          autoComplete="username"
          placeholder="name@example.com 或 +8613800138000"
          {...form.register('identifier')}
          error={form.formState.errors.identifier?.message}
        />
        {requestReset.error ? (
          <p className={styles.error} role="alert">
            {requestReset.error.message}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          loading={requestReset.isPending}
          className={styles.wideButton}
        >
          <MailCheck size={18} />
          发送重置指引
        </Button>
      </form>
    </AuthFormShell>
  );
}
