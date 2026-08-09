import { useQuery } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, authKeys } from '@/domains/auth';
import { Button } from '@/shared/ui';
import { AuthFormShell } from './AuthFormShell';
import styles from './AuthPages.module.css';

export function EmailVerificationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const query = useQuery({
    queryKey: authKeys.emailVerification(token),
    queryFn: () => authApi.confirmEmailVerification(token),
    enabled: token.length > 0,
    retry: false,
  });

  if (!token) {
    return (
      <AuthFormShell
        eyebrow="账号安全"
        title="邮箱验证链接无效"
        description="链接中缺少验证令牌，请从账号与安全页重新发送验证邮件。"
        backTo="/auth/login"
      >
        <p className={styles.error} role="alert">
          缺少 token 参数。
        </p>
      </AuthFormShell>
    );
  }

  if (query.isPending) {
    return (
      <AuthFormShell
        eyebrow="账号安全"
        title="正在验证邮箱"
        description="正在把邮件令牌提交给认证服务，请稍候。"
        backTo="/auth/login"
      >
        <div className={styles.emailResetNotice} role="status">
          <MailCheck size={22} />
          <span>
            <strong>正在确认验证链接</strong>
            <small>结果以认证服务返回为准。</small>
          </span>
        </div>
      </AuthFormShell>
    );
  }

  if (query.isError) {
    return (
      <AuthFormShell
        eyebrow="账号安全"
        title="邮箱验证失败"
        description="验证链接可能已过期、已使用或不再有效。"
        backTo="/auth/login"
      >
        <p className={styles.error} role="alert">
          {query.error.message}
        </p>
        <Button
          size="lg"
          className={styles.wideButton}
          onClick={() => void navigate('/settings/account')}
        >
          返回账号与安全
        </Button>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      eyebrow="账号安全"
      title="邮箱验证完成"
      description="认证服务已确认当前主邮箱。"
      backTo="/auth/login"
      status="邮箱已验证"
    >
      <div className={styles.emailResetNotice} role="status">
        <MailCheck size={22} />
        <span>
          <strong>验证成功</strong>
          <small>你现在可以回到账号与安全页查看最新验证状态。</small>
        </span>
      </div>
      <Button
        size="lg"
        className={styles.wideButton}
        onClick={() => void navigate('/settings/account')}
      >
        返回账号与安全
      </Button>
    </AuthFormShell>
  );
}
