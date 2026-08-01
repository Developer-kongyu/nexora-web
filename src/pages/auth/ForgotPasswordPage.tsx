import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '@/domains/auth';
import { paths } from '@/shared/config/paths';
import { Button, TextField } from '@/shared/ui';
import { AuthFormShell } from './AuthFormShell';
import styles from './AuthPages.module.css';

const schema = z.object({
  identifier: z.string().trim().min(1, '请输入已绑定的邮箱或手机号'),
});

type ForgotPasswordValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState('');
  const requestReset = useMutation({ mutationFn: authApi.requestPasswordReset });
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    await requestReset.mutateAsync({ identifier: values.identifier });
    setSentTo(values.identifier);
  });

  return (
    <AuthFormShell
      eyebrow="账号恢复"
      title="找回密码"
      description="输入已绑定的邮箱或手机号，我们会发送一次性重置验证码。"
      backTo="/auth/login"
      status={sentTo ? '重置验证码已发送，请在 10 分钟内完成验证。' : undefined}
    >
      <form className={styles.form} onSubmit={submit}>
        <TextField
          label="邮箱或手机号"
          autoComplete="username"
          placeholder="name@example.com / +86"
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
          {sentTo ? '重新发送验证码' : '发送重置验证码'}
        </Button>
        {sentTo ? (
          <Link className={styles.continueLink} to={paths.passwordResetFor(sentTo)}>
            继续验证并设置新密码
            <ArrowRight size={17} />
          </Link>
        ) : null}
      </form>
    </AuthFormShell>
  );
}
