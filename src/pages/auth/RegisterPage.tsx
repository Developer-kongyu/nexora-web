import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  authApi,
  passwordConfirmationFieldSchema,
  passwordsMatch,
  strongPasswordSchema,
  useRegister,
  verificationCodeSchema,
} from '@/domains/auth';
import { Button, TextField, useToast } from '@/shared/ui';
import { AuthFormShell } from './AuthFormShell';
import styles from './AuthPages.module.css';
import { useVerificationCountdown } from './useVerificationCountdown';

const schema = z
  .object({
    email: z.string().trim().email('请输入有效邮箱'),
    code: verificationCodeSchema,
    password: strongPasswordSchema,
    confirmPassword: passwordConfirmationFieldSchema,
    agreed: z.boolean().refine(Boolean, '请阅读并同意服务条款与隐私政策'),
  })
  .refine(passwordsMatch, {
    path: ['confirmPassword'],
    message: '两次输入的密码不一致',
  });

type RegisterValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const registerMutation = useRegister();
  const requestCode = useMutation({ mutationFn: authApi.requestRegistrationCode });
  const countdown = useVerificationCountdown();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      code: '',
      password: '',
      confirmPassword: '',
      agreed: false,
    },
  });

  const sendCode = async () => {
    const valid = await form.trigger('email');
    if (!valid || countdown.active) return;
    const result = await requestCode.mutateAsync({ email: form.getValues('email').trim() });
    countdown.start(result.retryAfterSeconds);
    showToast({ tone: 'success', title: '注册验证码已发送' });
  };

  const submit = form.handleSubmit(async (values) => {
    await registerMutation.mutateAsync({
      email: values.email,
      code: values.code,
      password: values.password,
    });
    showToast({ tone: 'success', title: '账号创建成功', description: '接下来设置你的兴趣偏好' });
    void navigate('/onboarding/interests', { replace: true });
  });

  const error = registerMutation.error || requestCode.error;

  return (
    <AuthFormShell
      eyebrow="加入社区"
      title="创建你的账号"
      description="只需几步，即可开始分享和连接。"
      backTo="/auth/login"
      footer={
        <span>
          已有账号？ <Link to="/auth/login">直接登录</Link>
        </span>
      }
    >
      <form className={styles.form} onSubmit={submit}>
        <TextField
          label="邮箱"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          {...form.register('email')}
          error={form.formState.errors.email?.message}
        />
        <div className={styles.codeRow}>
          <TextField
            label="邮箱验证码"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6 位验证码"
            maxLength={6}
            {...form.register('code')}
            error={form.formState.errors.code?.message}
          />
          <Button
            type="button"
            variant="secondary"
            loading={requestCode.isPending}
            disabled={countdown.active}
            onClick={() => void sendCode()}
          >
            {countdown.active ? `${countdown.seconds}s 后重发` : '发送验证码'}
          </Button>
        </div>
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
          <span>不使用常见弱密码</span>
          <span>两次输入一致</span>
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
        {error ? (
          <p className={styles.error} role="alert">
            {error.message}
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
        <span>注册成功后，你可以随时在设置中调整账号、隐私和推荐偏好。</span>
      </div>
    </AuthFormShell>
  );
}
