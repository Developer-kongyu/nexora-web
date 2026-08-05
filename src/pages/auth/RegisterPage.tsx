import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  onboardingPathForStatus,
  passwordConfirmationFieldSchema,
  passwordsMatch,
  strongPasswordSchema,
  useRegister,
} from '@/domains/auth';
import { Button, TextField, useToast } from '@/shared/ui';
import { AuthFormShell } from './AuthFormShell';
import styles from './AuthPages.module.css';

const schema = z
  .object({
    email: z.string().trim().email('请输入有效邮箱'),
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
  .refine(passwordsMatch, { path: ['confirmPassword'], message: '两次输入的密码不一致' });

type RegisterValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const registerMutation = useRegister();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', handle: '', password: '', confirmPassword: '', agreed: false },
  });
  const submit = form.handleSubmit(async (values) => {
    const session = await registerMutation.mutateAsync({
      email: values.email,
      handle: values.handle,
      password: values.password,
    });
    showToast({ tone: 'success', title: '账号创建成功', description: '接下来设置你的兴趣偏好' });
    void navigate(onboardingPathForStatus(session.onboardingStatus) ?? '/home', { replace: true });
  });
  return (
    <AuthFormShell
      eyebrow="加入社区"
      title="创建你的账号"
      description="填写邮箱、唯一 Handle 与密码即可完成注册。"
      backTo="/auth/login"
      footer={
        <span>
          已有账号？<Link to="/auth/login">直接登录</Link>
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
        <span>注册后可通过独立的邮箱验证流程完成邮箱认证。</span>
      </div>
    </AuthFormShell>
  );
}
