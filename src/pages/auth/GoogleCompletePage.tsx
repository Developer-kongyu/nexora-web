import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useCompleteGoogleProfile } from '@/domains/auth';
import { Button, TextField, useToast } from '@/shared/ui';
import { AuthFormShell } from './AuthFormShell';
import styles from './AuthPages.module.css';

const schema = z.object({
  displayName: z.string().trim().min(2, '展示名称至少 2 个字符').max(32, '展示名称最多 32 个字符'),
  handle: z
    .string()
    .trim()
    .min(3, 'Handle 至少 3 个字符')
    .max(24, 'Handle 最多 24 个字符')
    .regex(/^[A-Za-z0-9_]+$/, '仅支持字母、数字与下划线'),
  bio: z.string().trim().max(160, '个人简介最多 160 个字符').optional(),
});

type GoogleCompleteValues = z.infer<typeof schema>;

export function GoogleCompletePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const completeProfile = useCompleteGoogleProfile();
  const form = useForm<GoogleCompleteValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', handle: '', bio: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    await completeProfile.mutateAsync(values);
    showToast({ tone: 'success', title: '资料已保存' });
    void navigate('/onboarding/interests', { replace: true });
  });

  return (
    <AuthFormShell
      eyebrow="首次登录"
      title="完善公开资料"
      description="确认展示名称与唯一 handle，之后仍可在设置中修改。"
      backTo="/auth/login"
    >
      <form className={styles.form} onSubmit={submit}>
        <TextField
          label="展示名称"
          autoComplete="name"
          placeholder="你的公开名称"
          {...form.register('displayName')}
          error={form.formState.errors.displayName?.message}
        />
        <TextField
          label="Handle"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="例如 zhiqiu"
          hint="仅支持字母、数字与下划线"
          {...form.register('handle')}
          error={form.formState.errors.handle?.message}
        />
        <TextField
          label="个人简介（可选）"
          multiline
          placeholder="简单介绍你的兴趣与创作方向"
          {...form.register('bio')}
          error={form.formState.errors.bio?.message}
        />
        {completeProfile.error ? (
          <p className={styles.error} role="alert">
            {completeProfile.error.message}
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
