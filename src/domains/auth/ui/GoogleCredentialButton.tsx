import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { env } from '@/shared/config/env';
import { cn } from '@/shared/lib/cn';
import { configureGoogleIdentityServices, loadGoogleIdentityServices } from '../lib/googleIdentity';
import styles from './GoogleCredentialButton.module.css';

interface GoogleCredentialButtonProps {
  disabled?: boolean;
  onCredential: (idToken: string) => void | Promise<void>;
  onError: (message: string) => void;
}

export function GoogleCredentialButton({
  disabled = false,
  onCredential,
  onError,
}: GoogleCredentialButtonProps) {
  const clientId = env.VITE_GOOGLE_CLIENT_ID.trim();
  const configurationError = clientId ? null : '缺少 VITE_GOOGLE_CLIENT_ID，无法启动 Google 登录';
  const hostRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(Boolean(clientId));
  const emitCredential = useEffectEvent((idToken: string) => onCredential(idToken));
  const emitError = useEffectEvent((message: string) => onError(message));

  useEffect(() => {
    if (!clientId) return undefined;

    let active = true;
    let releaseHandler: (() => void) | undefined;
    void loadGoogleIdentityServices()
      .then((services) => {
        if (!active || !hostRef.current) return;
        releaseHandler = configureGoogleIdentityServices(services, clientId, (response) => {
          if (!response.credential) {
            emitError('Google 未返回 ID Token，请重新选择账号');
            return;
          }
          void Promise.resolve(emitCredential(response.credential)).catch((cause: unknown) =>
            emitError(cause instanceof Error ? cause.message : 'Google ID Token 校验失败'),
          );
        });
        const host = hostRef.current;
        host.replaceChildren();
        services.accounts.id.renderButton(host, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          locale: 'zh_CN',
          width: Math.min(400, Math.max(200, host.clientWidth || 400)),
        });
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setLoading(false);
        emitError(cause instanceof Error ? cause.message : 'Google Identity Services 初始化失败');
      });

    return () => {
      active = false;
      releaseHandler?.();
    };
  }, [clientId]);

  return (
    <div
      className={cn(styles.root, disabled && styles.disabled)}
      aria-busy={loading}
      aria-disabled={disabled}
    >
      <div ref={hostRef} className={styles.host} />
      {loading ? <span className={styles.loading}>正在加载 Google 登录…</span> : null}
      {configurationError ? (
        <span className={styles.loading} role="alert">
          {configurationError}
        </span>
      ) : null}
    </div>
  );
}
