import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, LockKeyhole, MailCheck, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { authApi, useLogin, useLoginWithCode } from '@/domains/auth';
import { Button, TextField, useToast } from '@/shared/ui';
import { AuthFormShell } from './AuthFormShell';
import styles from './AuthPages.module.css';
import { useVerificationCountdown } from './useVerificationCountdown';

const schema = z.object({
  identifier: z.string().trim().min(1, '请输入邮箱、手机号或 handle'),
  secret: z.string().min(1, '请输入密码或验证码'),
});

type LoginValues = z.infer<typeof schema>;
type LoginMode = 'password' | 'code';

export function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('password');
  const [showPassword, setShowPassword] = useState(false);
  const passwordLogin = useLogin();
  const codeLogin = useLoginWithCode();
  const requestCode = useMutation({ mutationFn: authApi.requestLoginCode });
  const countdown = useVerificationCountdown();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', secret: '' },
  });

  const switchMode = (nextMode: LoginMode) => {
    setMode(nextMode);
    setShowPassword(false);
    form.resetField('secret');
    form.clearErrors();
  };

  const sendCode = async () => {
    const valid = await form.trigger('identifier');
    if (!valid || countdown.active) return;
    const identifier = form.getValues('identifier').trim();
    const result = await requestCode.mutateAsync({ identifier });
    countdown.start(result.retryAfterSeconds);
    showToast({ tone: 'success', title: '验证码已发送', description: '请在 10 分钟内完成登录。' });
  };

  const submit = form.handleSubmit(async (values) => {
    if (mode === 'password' && values.secret.length < 8) {
      form.setError('secret', { message: '密码至少 8 位' });
      return;
    }
    if (mode === 'code' && !/^\d{6}$/.test(values.secret)) {
      form.setError('secret', { message: '请输入 6 位数字验证码' });
      return;
    }

    if (mode === 'password') {
      await passwordLogin.mutateAsync({ identifier: values.identifier, password: values.secret });
    } else {
      await codeLogin.mutateAsync({ identifier: values.identifier, code: values.secret });
    }

    showToast({ tone: 'success', title: '登录成功', description: '欢迎回到 LCT Circle' });
    const from = (location.state as { from?: string } | null)?.from || '/home';
    void navigate(from, { replace: true });
  });

  const loginError = passwordLogin.error || codeLogin.error || requestCode.error;
  const isPending = passwordLogin.isPending || codeLogin.isPending;

  return (
    <AuthFormShell
      eyebrow="欢迎回来"
      title="登录 LCT Circle"
      description="继续探索你的兴趣、创作与社群。"
      footer={
        <span>
          还没有账号？ <Link to="/auth/register">立即注册</Link>
        </span>
      }
    >
      <div className={styles.tabs}>
        <button
          type="button"
          className={mode === 'password' ? styles.active : undefined}
          onClick={() => switchMode('password')}
        >
          密码登录
        </button>
        <button
          type="button"
          className={mode === 'code' ? styles.active : undefined}
          onClick={() => switchMode('code')}
        >
          验证码登录
        </button>
      </div>

      <form className={styles.form} onSubmit={submit}>
        <TextField
          label="账号"
          autoComplete="username"
          placeholder="邮箱、手机号或 @handle"
          {...form.register('identifier')}
          error={form.formState.errors.identifier?.message}
        />
        {mode === 'password' ? (
          <div className={styles.fieldWrap}>
            <TextField
              label="密码"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="请输入密码"
              {...form.register('secret')}
              error={form.formState.errors.secret?.message}
            />
            <button
              type="button"
              aria-label="显示或隐藏密码"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        ) : (
          <div className={styles.codeRow}>
            <TextField
              label="验证码"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6 位验证码"
              maxLength={6}
              {...form.register('secret')}
              error={form.formState.errors.secret?.message}
            />
            <Button
              type="button"
              variant="secondary"
              loading={requestCode.isPending}
              disabled={countdown.active}
              onClick={() => void sendCode()}
            >
              {countdown.active ? `${countdown.seconds}s` : '发送验证码'}
            </Button>
          </div>
        )}

        <div className={styles.formMeta}>
          <label className={styles.checkbox}>
            <input type="checkbox" defaultChecked />
            记住我
          </label>
          {mode === 'password' ? (
            <Link className={styles.link} to="/auth/password/forgot">
              忘记密码？
            </Link>
          ) : (
            <span className={styles.terms}>验证码 10 分钟内有效</span>
          )}
        </div>

        {loginError ? (
          <p className={styles.error} role="alert">
            {loginError.message}
          </p>
        ) : null}
        <Button type="submit" size="lg" loading={isPending} className={styles.wideButton}>
          {mode === 'password' ? <LockKeyhole size={18} /> : <MailCheck size={18} />}
          登录
        </Button>
      </form>

      <div className={styles.divider}>或使用</div>
      <button
        type="button"
        className={styles.google}
        onClick={() => navigate('/auth/google/complete')}
      >
        <span>G</span>
        使用 Google 继续
      </button>
      <div className={styles.security}>
        <ShieldCheck size={18} />
        <span>登录信息通过加密连接传输。我们不会通过私信索要你的密码或验证码。</span>
      </div>
    </AuthFormShell>
  );
}
