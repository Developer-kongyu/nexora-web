import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, LockKeyhole, MailCheck, ShieldCheck } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  GoogleCredentialButton,
  authApi,
  onboardingPathForStatus,
  useLogin,
  useLoginWithCode,
  useVerifyGoogleIdToken,
} from '@/domains/auth';
import { APP_BRAND } from '@/shared/config/brand';
import { Button, TextField, useToast } from '@/shared/ui';
import { AuthFormShell } from './AuthFormShell';
import styles from './AuthPages.module.css';
import {
  type LoginMode,
  validateLoginIdentifier,
  validateLoginSecret,
} from './loginValidation';
import { useVerificationCountdown } from './useVerificationCountdown';

interface LoginValues {
  identifier: string;
  secret: string;
}

export function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('password');
  const [showPassword, setShowPassword] = useState(false);
  const passwordLogin = useLogin();
  const codeLogin = useLoginWithCode();
  const googleLogin = useVerifyGoogleIdToken();
  const requestCode = useMutation({ mutationFn: authApi.requestLoginCode });
  const countdown = useVerificationCountdown();
  const [googleFlowError, setGoogleFlowError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const form = useForm<LoginValues>({
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
    const identifier = values.identifier.trim();

    const session =
      mode === 'password'
        ? await passwordLogin.mutateAsync({
            identifier,
            password: values.secret,
          })
        : await codeLogin.mutateAsync({ identifier, code: values.secret });

    showToast({ tone: 'success', title: '登录成功', description: `欢迎回到 ${APP_BRAND.name}` });
    const from = (location.state as { from?: string } | null)?.from || '/home';
    const destination = session.onboardingCompleted
      ? from
      : (onboardingPathForStatus(session.onboardingStatus) ?? from);
    void navigate(destination, { replace: true });
  });

  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      setGoogleFlowError(null);
      const result = await googleLogin.mutateAsync(idToken);
      if (result.mode === 'PROFILE_COMPLETION_REQUIRED') {
        sessionStorage.setItem(
          'google-profile-completion',
          JSON.stringify({
            pendingUserId: result.pendingUserId,
            completionToken: result.completionToken,
            expiresAt: Date.now() + result.completionTokenExpiresInSeconds * 1000,
          }),
        );
        void navigate('/auth/google/complete', { replace: true });
        return;
      }

      showToast({ tone: 'success', title: 'Google 登录成功', description: `欢迎回到 ${APP_BRAND.name}` });
      const from = (location.state as { from?: string } | null)?.from || '/home';
      const session = result.authSession;
      const destination = session.onboardingCompleted
        ? from
        : (onboardingPathForStatus(session.onboardingStatus) ?? from);
      void navigate(destination, { replace: true });
    },
    [googleLogin, location.state, navigate, showToast],
  );

  const loginError = passwordLogin.error || codeLogin.error || requestCode.error;
  const isPending = passwordLogin.isPending || codeLogin.isPending;

  return (
    <AuthFormShell
      eyebrow="欢迎回来"
      title={`登录 ${APP_BRAND.name}`}
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
          label={mode === 'code' ? '手机号' : '账号'}
          autoComplete={mode === 'code' ? 'tel' : 'username'}
          inputMode={mode === 'code' ? 'tel' : undefined}
          placeholder={
            mode === 'code' ? '请输入手机号，如 +8613800138000' : '邮箱、手机号或 @handle'
          }
          {...form.register('identifier', {
            validate: (value) => validateLoginIdentifier(value, mode),
          })}
          error={form.formState.errors.identifier?.message}
        />
        {mode === 'password' ? (
          <div className={styles.fieldWrap}>
            <TextField
              label="密码"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="请输入密码"
              {...form.register('secret', {
                validate: (value) => validateLoginSecret(value, mode),
              })}
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
              placeholder="请输入 6 位验证码"
              maxLength={6}
              {...form.register('secret', {
                validate: (value) => validateLoginSecret(value, mode),
              })}
              error={form.formState.errors.secret?.message}
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
      <GoogleCredentialButton
        disabled={googleLogin.isPending}
        onCredential={handleGoogleCredential}
        onError={setGoogleFlowError}
      />
      {googleFlowError || googleLogin.error ? (
        <p className={styles.error} role="alert">
          {googleFlowError ?? googleLogin.error?.message}
        </p>
      ) : null}
      <div className={styles.security}>
        <ShieldCheck size={18} />
        <span>登录信息通过加密连接传输。我们不会通过私信索要你的密码或验证码。</span>
      </div>
    </AuthFormShell>
  );
}
