import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  authApi,
  isE164Phone,
  onboardingPathForStatus,
  passwordConfirmationFieldSchema,
  passwordsMatch,
  strongPasswordSchema,
  useRegister,
} from '@/domains/auth';
import { Button, TextField, useToast } from '@/shared/ui';
import { AuthFormShell } from './AuthFormShell';
import styles from './AuthPages.module.css';
import { useVerificationCountdown } from './useVerificationCountdown';

type RegisterMode = 'email' | 'phone';

const schema = z
  .object({
    mode: z.enum(['email', 'phone']),
    identifier: z.string().trim().min(1, '请输入邮箱'),
    code: z.string().trim(),
    handle: z
      .string()
      .trim()
      .min(3, 'Handle 至少 3 个字符')
      .max(24, 'Handle 最多 24 个字符')
      .regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'Handle 需以字母开头，仅支持字母、数字与下划线'),
    password: strongPasswordSchema,
    confirmPassword: passwordConfirmationFieldSchema,
    agreed: z.boolean().refine(Boolean, '请阅读并同意服务条款与隐私政策'),
  })
  .superRefine((values, context) => {
    if (values.mode === 'email') {
      if (!z.string().email().safeParse(values.identifier).success) {
        context.addIssue({ code: 'custom', path: ['identifier'], message: '请输入有效邮箱' });
      }
      return;
    }

    if (!isE164Phone(values.identifier)) {
      context.addIssue({
        code: 'custom',
        path: ['identifier'],
        message: '请输入有效的手机号（需含国家代码，如 +8613800138000）',
      });
    }
    if (!/^\d{6}$/.test(values.code)) {
      context.addIssue({ code: 'custom', path: ['code'], message: '请输入 6 位数字验证码' });
    }
  })
  .refine(passwordsMatch, { path: ['confirmPassword'], message: '两次输入的密码不一致' });

type RegisterValues = z.infer<typeof schema>;

export function RegisterPage() {
  const [mode, setMode] = useState<RegisterMode>('email');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const registerMutation = useRegister();
  const requestCode = useMutation({ mutationFn: authApi.requestPhoneRegistrationCode });
  const countdown = useVerificationCountdown();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: 'email',
      identifier: '',
      code: '',
      handle: '',
      password: '',
      confirmPassword: '',
      agreed: false,
    },
  });

  const switchMode = (nextMode: RegisterMode) => {
    setMode(nextMode);
    form.setValue('mode', nextMode);
    form.resetField('identifier');
    form.resetField('code');
    form.clearErrors();
    requestCode.reset();
    registerMutation.reset();
  };

  const sendCode = async () => {
    const phone = form.getValues('identifier').trim();
    if (!phone) {
      form.setError('identifier', { message: '请输入手机号' });
      return;
    }
    if (!isE164Phone(phone)) {
      form.setError('identifier', {
        message: '请输入有效的手机号（需含国家代码，如 +8613800138000）',
      });
      return;
    }
    if (countdown.active) return;

    const result = await requestCode.mutateAsync({ phone });
    countdown.start(result.retryAfterSeconds);
    showToast({
      tone: 'success',
      title: '验证码已发送',
      description: '如果该手机号可用于注册，验证码将很快送达，请尽快完成注册。',
    });
  };

  const submit = form.handleSubmit(async (values) => {
    const session = await registerMutation.mutateAsync(
      values.mode === 'email'
        ? {
            mode: 'email',
            email: values.identifier,
            handle: values.handle,
            password: values.password,
          }
        : {
            mode: 'phone',
            phone: values.identifier,
            code: values.code,
            handle: values.handle,
            password: values.password,
          },
    );
    showToast({ tone: 'success', title: '账号创建成功', description: '接下来设置你的兴趣偏好' });
    void navigate(onboardingPathForStatus(session.onboardingStatus) ?? '/home', { replace: true });
  });
  return (
    <AuthFormShell
      eyebrow="加入社区"
      title="创建你的账号"
      description="使用邮箱或手机号创建账号。"
      backTo="/auth/login"
      footer={
        <span>
          已有账号？<Link to="/auth/login">直接登录</Link>
        </span>
      }
    >
      <div className={styles.tabs}>
        <button
          type="button"
          className={mode === 'email' ? styles.active : undefined}
          onClick={() => switchMode('email')}
        >
          邮箱注册
        </button>
        <button
          type="button"
          className={mode === 'phone' ? styles.active : undefined}
          onClick={() => switchMode('phone')}
        >
          手机号注册
        </button>
      </div>
      <form className={styles.form} onSubmit={submit}>
        <TextField
          label={mode === 'email' ? '邮箱' : '手机号'}
          type={mode === 'email' ? 'email' : 'tel'}
          autoComplete={mode === 'email' ? 'email' : 'tel'}
          inputMode={mode === 'email' ? 'email' : 'tel'}
          placeholder={mode === 'email' ? 'name@example.com' : '例如 +8613800138000'}
          {...form.register('identifier')}
          error={form.formState.errors.identifier?.message}
        />
        {mode === 'phone' ? (
          <div className={styles.codeRow}>
            <TextField
              label="验证码"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="请输入 6 位验证码"
              maxLength={6}
              {...form.register('code')}
              error={form.formState.errors.code?.message}
            />
            <Button
              className={styles.codeButton}
              type="button"
              variant="secondary"
              loading={requestCode.isPending}
              disabled={countdown.active}
              onClick={() => void sendCode()}
            >
              {countdown.active ? `${countdown.seconds}s` : '发送验证码'}
            </Button>
          </div>
        ) : null}
        <TextField
          label="Handle"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="例如 zhiqiu"
          hint="以字母开头，仅支持字母、数字与下划线"
          {...form.register('handle')}
          error={form.formState.errors.handle?.message}
        />
        <TextField
          label="密码"
          type="password"
          autoComplete="new-password"
          placeholder="至少 8 位，包含字母和数字"
          {...form.register('password')}
          error={form.formState.errors.password?.message}
        />
        <TextField
          label="确认密码"
          type="password"
          autoComplete="new-password"
          placeholder="再次输入密码"
          {...form.register('confirmPassword')}
          error={form.formState.errors.confirmPassword?.message}
        />
        <div className={styles.passwordRules}>
          <span>至少 8 个字符</span>
          <span>包含字母与数字</span>
          <span>Handle 注册后可修改</span>
        </div>
        <label className={styles.checkbox}>
          <input type="checkbox" {...form.register('agreed')} />
          我已阅读并同意服务条款与隐私政策
        </label>
        {form.formState.errors.agreed ? (
          <p className={styles.error} role="alert">
            {form.formState.errors.agreed.message}
          </p>
        ) : null}
        {registerMutation.error ? (
          <p className={styles.error} role="alert">
            {registerMutation.error.message}
          </p>
        ) : null}
        {requestCode.error ? (
          <p className={styles.error} role="alert">
            {requestCode.error.message}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          loading={registerMutation.isPending}
          className={styles.wideButton}
        >
          注册并继续
        </Button>
      </form>
      <div className={styles.security}>
        <ShieldCheck size={18} />
        <span>
          {mode === 'email'
            ? '注册后可通过独立的邮箱验证流程完成邮箱认证。'
            : '手机号验证通过后将直接完成认证并创建账号。'}
        </span>
      </div>
    </AuthFormShell>
  );
}
