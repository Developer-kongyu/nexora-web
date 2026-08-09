import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AtSign, KeyRound, Laptop, LockKeyhole, Mail, Phone, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  authApi,
  authKeys,
  isE164Phone,
  rememberPendingPrimaryEmail,
  strongPasswordSchema,
  useAuthStore,
  type AuthSessionItemView,
} from '@/domains/auth';
import { formatDateTime, formatRelativeTime } from '@/shared/lib/format';
import { Button, Card, Modal, TextField, useToast } from '@/shared/ui';
import { SettingsPage } from '../_shared/SettingsPage';
import styles from './SettingsPages.module.css';

const handlePattern = /^[A-Za-z][A-Za-z0-9_]{2,23}$/;

const authMethodLabels: Record<AuthSessionItemView['authMethod'], string> = {
  PASSWORD: '密码',
  PHONE_CODE: '手机验证码',
  GOOGLE_ID_TOKEN: 'Google',
};

function sessionDeviceName(session: AuthSessionItemView): string {
  if (session.deviceName?.trim()) return session.deviceName;
  const browserAndOs = [session.browserName, session.osName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' · ');
  if (browserAndOs) return browserAndOs;
  if (session.deviceFamily?.trim()) return session.deviceFamily;
  return '服务端未提供设备名称';
}

export function AccountSettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { showToast } = useToast();

  const accountQuery = useQuery({
    queryKey: authKeys.accountSecurity,
    queryFn: authApi.accountSecurity,
  });
  const sessionsQuery = useQuery({
    queryKey: authKeys.sessions,
    queryFn: authApi.sessions,
  });

  const [handleOpen, setHandleOpen] = useState(false);
  const [handleValue, setHandleValue] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneMode, setPhoneMode] = useState<'bind' | 'change-primary'>('bind');
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeRequested, setPhoneCodeRequested] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');

  const handleMutation = useMutation({
    mutationFn: (nextHandle: string) => authApi.changeHandle(nextHandle),
    onSuccess: (saved) => {
      queryClient.setQueryData(authKeys.accountSecurity, (current) =>
        current ? { ...current, handle: saved.handle } : current,
      );
      void queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      updateUser({ handle: saved.handle });
      setHandleOpen(false);
      setHandleValue('');
      showToast({ tone: 'success', title: 'Handle 已更新' });
    },
    onError: (error) =>
      showToast({
        tone: 'error',
        title: 'Handle 更新失败',
        description: error.message,
      }),
  });

  const currentEmailVerificationMutation = useMutation({
    mutationFn: authApi.requestEmailVerification,
    onSuccess: () =>
      showToast({
        tone: 'success',
        title: '验证邮件已发送',
        description: '请打开邮件中的链接完成验证。',
      }),
    onError: (error) =>
      showToast({
        tone: 'error',
        title: '验证邮件发送失败',
        description: error.message,
      }),
  });

  const emailIdentityVerificationMutation = useMutation({
    mutationFn: (email: string) => authApi.requestEmailIdentityVerification(email),
    onSuccess: (result, email) => {
      rememberPendingPrimaryEmail({ email, expiresAt: result.expiresAt });
      setEmailOpen(false);
      setEmailValue('');
      showToast({
        tone: 'success',
        title: '邮箱确认链接已发送',
        description: '请打开新邮箱中的链接，登录后完成绑定或换绑。',
      });
    },
    onError: (error) =>
      showToast({
        tone: 'error',
        title: '邮箱确认链接发送失败',
        description: error.message,
      }),
  });

  const phoneVerificationMutation = useMutation({
    mutationFn: (input: {
      phone: string;
      purpose: 'BIND_PHONE_VERIFY' | 'CHANGE_PRIMARY_PHONE_VERIFY';
    }) => authApi.requestPhoneIdentityVerification(input),
    onSuccess: (result) => {
      setPhoneCodeRequested(true);
      showToast({
        tone: 'success',
        title: '短信验证码已发送',
        description: result.expiresAt
          ? '验证码有效至 ' + formatDateTime(result.expiresAt)
          : '请查看手机短信并输入六位验证码。',
      });
    },
    onError: (error) =>
      showToast({
        tone: 'error',
        title: '短信验证码发送失败',
        description: error.message,
      }),
  });

  const phoneMutation = useMutation({
    mutationFn: (input: {
      mode: 'bind' | 'change-primary';
      phone: string;
      verificationCode: string;
    }) => authApi.changePrimaryPhone(input),
    onSuccess: (saved, input) => {
      queryClient.setQueryData(authKeys.accountSecurity, (current) =>
        current
          ? {
              ...current,
              phone: {
                value: saved.phone,
                isLoginEnabled: true,
                verifiedAt: saved.verifiedAtIso,
              },
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: authKeys.accountSecurity });
      void queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      setPhoneOpen(false);
      setPhoneValue('');
      setPhoneCode('');
      setPhoneCodeRequested(false);
      showToast({
        tone: 'success',
        title: input.mode === 'bind' ? '手机号已绑定' : '手机号已换绑',
      });
    },
    onError: (error) =>
      showToast({
        tone: 'error',
        title: phoneMode === 'bind' ? '手机号绑定失败' : '手机号换绑失败',
        description: error.message,
      }),
  });

  const passwordMutation = useMutation({
    mutationFn: (input: { currentPassword: string | null; newPassword: string }) =>
      authApi.changePassword(input),
    onSuccess: () => {
      showToast({
        tone: 'success',
        title: '密码已更新',
        description: '安全版本已更新，请重新登录。',
      });
      setAnonymous();
      void navigate('/auth/login', { replace: true });
    },
    onError: (error) =>
      showToast({
        tone: 'error',
        title: '密码更新失败',
        description: error.message,
      }),
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.sessions });
      void queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      showToast({ tone: 'success', title: '设备会话已退出' });
    },
    onError: (error) =>
      showToast({
        tone: 'error',
        title: '退出设备失败',
        description: error.message,
      }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (password: string | null) => authApi.deactivate(password),
    onSuccess: () => {
      showToast({
        tone: 'success',
        title: '账号已停用',
        description: '当前会话已失效。',
      });
      setAnonymous();
      void navigate('/auth/login', { replace: true });
    },
    onError: (error) =>
      showToast({
        tone: 'error',
        title: '账号停用失败',
        description: error.message,
      }),
  });

  if (accountQuery.isPending || (!accountQuery.data && !accountQuery.isError)) {
    return (
      <SettingsPage title="账号与安全" description="管理后端保存的登录身份与活动会话。">
        <Card className={styles.section}>
          <div className={styles.smallEmpty} role="status">
            <LockKeyhole size={22} />
            <strong>正在读取账号安全信息</strong>
            <p>页面不会显示示例身份或设备。</p>
          </div>
        </Card>
      </SettingsPage>
    );
  }

  if (accountQuery.isError || !accountQuery.data) {
    return (
      <SettingsPage title="账号与安全" description="管理后端保存的登录身份与活动会话。">
        <Card className={styles.section}>
          <div className={styles.smallEmpty} role="alert">
            <LockKeyhole size={22} />
            <strong>账号安全信息加载失败</strong>
            <p>未使用示例数据替代，请恢复服务后重新加载。</p>
            <Button variant="secondary" onClick={() => void accountQuery.refetch()}>
              重新加载
            </Button>
          </div>
        </Card>
      </SettingsPage>
    );
  }

  const account = accountQuery.data;
  const passwordValidation = strongPasswordSchema.safeParse(newPassword);
  const handleValid = handlePattern.test(handleValue.trim());
  const normalizedEmail = emailValue.trim();
  const emailValid = z.string().email().safeParse(normalizedEmail).success;
  const emailChanged = account.email?.value.toLowerCase() !== normalizedEmail.toLowerCase();
  const phoneValid = isE164Phone(phoneValue);
  const phoneCodeValid = /^[0-9]{6}$/.test(phoneCode);
  const passwordValid =
    passwordValidation.success &&
    newPassword === confirmPassword &&
    (!account.password.configured || currentPassword.length > 0);
  const deactivateValid = !account.password.configured || deactivatePassword.length > 0;

  const openHandle = () => {
    setHandleValue(account.handle);
    setHandleOpen(true);
  };

  const openEmail = () => {
    setEmailValue('');
    setEmailOpen(true);
  };

  const closeEmail = () => {
    setEmailOpen(false);
    setEmailValue('');
  };

  const openPhone = () => {
    setPhoneMode(account.phone ? 'change-primary' : 'bind');
    setPhoneValue('');
    setPhoneCode('');
    setPhoneCodeRequested(false);
    setPhoneOpen(true);
  };

  const closePhone = () => {
    setPhoneOpen(false);
    setPhoneValue('');
    setPhoneCode('');
    setPhoneCodeRequested(false);
  };

  const closePassword = () => {
    setPasswordOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const closeDeactivate = () => {
    setDeactivateOpen(false);
    setDeactivatePassword('');
  };

  return (
    <SettingsPage title="账号与安全" description="账号身份、密码状态和登录设备均来自认证服务。">
      <div className={styles.stack}>
        <Card className={styles.section}>
          <header>
            <span>
              <Mail size={18} />
            </span>
            <div>
              <h2>账号身份</h2>
              <p>只展示认证服务返回的主身份，不补全或猜测缺失信息。</p>
            </div>
            <span className={styles.headerBadge}>{account.status}</span>
          </header>
          <div className={styles.rows}>
            <div>
              <div>
                <strong>
                  <AtSign size={15} /> Handle
                </strong>
                <span>@{account.handle}</span>
              </div>
              <Button size="sm" variant="secondary" onClick={openHandle}>
                修改
              </Button>
            </div>
            <div>
              <div>
                <strong>
                  <Mail size={15} /> 邮箱
                </strong>
                <span>
                  {account.email
                    ? account.email.value +
                      (account.email.verifiedAt
                        ? ' · 已验证于 ' + formatDateTime(account.email.verifiedAt)
                        : ' · 未验证')
                    : '未绑定'}
                </span>
              </div>
              <div className={styles.rowActions}>
                {account.email && !account.email.verifiedAt ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={currentEmailVerificationMutation.isPending}
                    onClick={() => currentEmailVerificationMutation.mutate()}
                  >
                    验证当前邮箱
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" onClick={openEmail}>
                  {account.email ? '换绑邮箱' : '绑定邮箱'}
                </Button>
              </div>
            </div>
            <div>
              <div>
                <strong>
                  <Phone size={15} /> 手机号
                </strong>
                <span>
                  {account.phone
                    ? account.phone.value +
                      (account.phone.verifiedAt
                        ? ' · 已验证于 ' + formatDateTime(account.phone.verifiedAt)
                        : ' · 未验证')
                    : '未绑定'}
                </span>
              </div>
              <Button size="sm" variant="secondary" onClick={openPhone}>
                {account.phone ? '换绑手机号' : '绑定手机号'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <KeyRound size={18} />
            </span>
            <div>
              <h2>登录密码</h2>
              <p>密码是否设置及更新时间来自密码凭证记录。</p>
            </div>
          </header>
          <div className={styles.rows}>
            <div>
              <div>
                <strong>{account.password.configured ? '密码已设置' : '尚未设置密码'}</strong>
                <span>
                  {account.password.updatedAt
                    ? '更新于 ' + formatDateTime(account.password.updatedAt)
                    : account.password.setAt
                      ? '设置于 ' + formatDateTime(account.password.setAt)
                      : '服务端未返回密码时间'}
                </span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setPasswordOpen(true)}>
                {account.password.configured ? '修改密码' : '设置密码'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className={styles.section} id="devices">
          <header>
            <span>
              <Laptop size={18} />
            </span>
            <div>
              <h2>登录设备</h2>
              <p>仅显示会话接口公开的设备、浏览器、系统和时间字段。</p>
            </div>
            <span className={styles.headerBadge}>
              {sessionsQuery.data ? sessionsQuery.data.total + ' 台设备' : '正在加载'}
            </span>
          </header>
          {sessionsQuery.isPending ? (
            <div className={styles.smallEmpty} role="status">
              <Laptop size={22} />
              <strong>正在读取登录设备</strong>
              <p>不会在加载期间显示示例设备。</p>
            </div>
          ) : sessionsQuery.isError || !sessionsQuery.data ? (
            <div className={styles.smallEmpty} role="alert">
              <Laptop size={22} />
              <strong>登录设备加载失败</strong>
              <p>未使用示例 IP、位置或设备替代。</p>
              <Button variant="secondary" onClick={() => void sessionsQuery.refetch()}>
                重新加载
              </Button>
            </div>
          ) : sessionsQuery.data.list.length === 0 ? (
            <div className={styles.smallEmpty}>
              <Laptop size={22} />
              <strong>没有活动会话</strong>
              <p>这是会话服务当前返回的结果。</p>
            </div>
          ) : (
            <div className={styles.devices}>
              {sessionsQuery.data.list.map((session) => (
                <article key={session.sessionId}>
                  <span>
                    <Laptop size={20} />
                  </span>
                  <div>
                    <strong>{sessionDeviceName(session)}</strong>
                    <p>
                      登录方式：{authMethodLabels[session.authMethod]} · 创建于{' '}
                      {formatDateTime(session.createdAtIso)}
                    </p>
                    <small>
                      最近活动 {formatRelativeTime(session.lastActiveOrCreatedAtIso)} · 到期于{' '}
                      {formatDateTime(session.expiresAtIso)}
                    </small>
                  </div>
                  {session.isCurrent ? (
                    <i>当前</i>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={
                        revokeMutation.isPending && revokeMutation.variables === session.sessionId
                      }
                      onClick={() => revokeMutation.mutate(session.sessionId)}
                    >
                      退出
                    </Button>
                  )}
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card className={[styles.section, styles.danger].join(' ')}>
          <header>
            <span>
              <Trash2 size={18} />
            </span>
            <div>
              <h2>危险操作</h2>
              <p>项目当前后端只提供账号停用，没有永久删除接口。</p>
            </div>
          </header>
          <div className={styles.rows}>
            <div>
              <div>
                <strong>停用账号</strong>
                <span>账号状态将由后端停用流程更新，并使活动会话失效。</span>
              </div>
              <Button size="sm" variant="danger" onClick={() => setDeactivateOpen(true)}>
                停用
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={handleOpen}
        title="修改 Handle"
        description="Handle 将通过认证服务的正式修改接口保存。"
        onClose={() => setHandleOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setHandleOpen(false)}>
              取消
            </Button>
            <Button
              loading={handleMutation.isPending}
              disabled={!handleValid || handleValue.trim() === account.handle}
              onClick={() => handleMutation.mutate(handleValue.trim())}
            >
              保存 Handle
            </Button>
          </>
        }
      >
        <TextField
          label="新 Handle"
          name="handle"
          value={handleValue}
          maxLength={24}
          hint="以字母开头，仅支持字母、数字与下划线"
          error={handleValue.length > 0 && !handleValid ? '请输入 3–24 位有效 Handle' : undefined}
          onChange={(event) => setHandleValue(event.target.value)}
        />
      </Modal>

      <Modal
        open={emailOpen}
        title={account.email ? '换绑邮箱' : '绑定邮箱'}
        description="系统会向新邮箱发送确认链接；只有点击链接并通过后端令牌校验后，主邮箱才会更新。"
        onClose={closeEmail}
        footer={
          <>
            <Button variant="secondary" onClick={closeEmail}>
              取消
            </Button>
            <Button
              loading={emailIdentityVerificationMutation.isPending}
              disabled={!emailValid || !emailChanged}
              onClick={() => emailIdentityVerificationMutation.mutate(normalizedEmail)}
            >
              发送确认链接
            </Button>
          </>
        }
      >
        <TextField
          label={account.email ? '新邮箱' : '邮箱'}
          type="email"
          name="email"
          autoComplete="email"
          value={emailValue}
          placeholder="name@example.com"
          hint="确认链接有效期由认证服务返回，链接只能使用一次。"
          error={emailValue.length > 0 && !emailValid ? '请输入有效的邮箱地址' : undefined}
          onChange={(event) => setEmailValue(event.target.value)}
        />
      </Modal>

      <Modal
        open={phoneOpen}
        title={phoneMode === 'bind' ? '绑定手机号' : '换绑手机号'}
        description="手机号必须使用包含国家代码的 E.164 格式，并通过短信验证码确认归属。"
        onClose={closePhone}
        footer={
          <>
            <Button variant="secondary" onClick={closePhone}>
              取消
            </Button>
            <Button
              variant="secondary"
              loading={phoneVerificationMutation.isPending}
              disabled={!phoneValid || phoneMutation.isPending}
              onClick={() =>
                phoneVerificationMutation.mutate({
                  phone: phoneValue.trim(),
                  purpose: 'CHANGE_PRIMARY_PHONE_VERIFY',
                })
              }
            >
              {phoneCodeRequested ? '重新发送验证码' : '发送验证码'}
            </Button>
            <Button
              loading={phoneMutation.isPending}
              disabled={!phoneValid || !phoneCodeRequested || !phoneCodeValid}
              onClick={() =>
                phoneMutation.mutate({
                  mode: phoneMode,
                  phone: phoneValue.trim(),
                  verificationCode: phoneCode,
                })
              }
            >
              {phoneMode === 'bind' ? '确认绑定' : '确认换绑'}
            </Button>
          </>
        }
      >
        <div className={styles.modalFields}>
          <TextField
            label={phoneMode === 'bind' ? '手机号' : '新手机号'}
            type="tel"
            inputMode="tel"
            name="phone"
            autoComplete="tel"
            value={phoneValue}
            placeholder="+8613800138000"
            hint="请输入包含国家代码的完整号码"
            error={phoneValue.length > 0 && !phoneValid ? '请输入有效的 E.164 手机号' : undefined}
            onChange={(event) => {
              setPhoneValue(event.target.value);
              setPhoneCode('');
              setPhoneCodeRequested(false);
            }}
          />
          <TextField
            label="短信验证码"
            type="text"
            inputMode="numeric"
            name="phoneVerificationCode"
            autoComplete="one-time-code"
            value={phoneCode}
            maxLength={6}
            placeholder="请输入 6 位验证码"
            disabled={!phoneCodeRequested}
            error={phoneCode.length > 0 && !phoneCodeValid ? '验证码必须是 6 位数字' : undefined}
            onChange={(event) => setPhoneCode(event.target.value.replace(/[^0-9]/g, ''))}
          />
        </div>
      </Modal>
      <Modal
        open={passwordOpen}
        title={account.password.configured ? '修改登录密码' : '设置登录密码'}
        description="成功后认证服务会清除当前凭证，并要求重新登录。"
        onClose={closePassword}
        footer={
          <>
            <Button variant="secondary" onClick={closePassword}>
              取消
            </Button>
            <Button
              loading={passwordMutation.isPending}
              disabled={!passwordValid}
              onClick={() =>
                passwordMutation.mutate({
                  currentPassword: account.password.configured ? currentPassword : null,
                  newPassword,
                })
              }
            >
              <LockKeyhole size={15} /> 确认修改
            </Button>
          </>
        }
      >
        <div className={styles.modalFields}>
          {account.password.configured ? (
            <TextField
              label="当前密码"
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          ) : null}
          <TextField
            label="新密码"
            type="password"
            name="newPassword"
            autoComplete="new-password"
            value={newPassword}
            placeholder="至少 8 位，包含字母和数字"
            error={
              newPassword && !passwordValidation.success
                ? passwordValidation.error.issues[0]?.message
                : undefined
            }
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <TextField
            label="确认新密码"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            error={
              confirmPassword && confirmPassword !== newPassword
                ? '两次输入的密码不一致'
                : undefined
            }
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={deactivateOpen}
        title="停用账号？"
        description="此操作会更改后端账号状态并使会话失效。"
        onClose={closeDeactivate}
        footer={
          <>
            <Button variant="secondary" onClick={closeDeactivate}>
              取消
            </Button>
            <Button
              variant="danger"
              loading={deactivateMutation.isPending}
              disabled={!deactivateValid}
              onClick={() =>
                deactivateMutation.mutate(account.password.configured ? deactivatePassword : null)
              }
            >
              确认停用
            </Button>
          </>
        }
      >
        {account.password.configured ? (
          <TextField
            label="当前密码"
            type="password"
            name="deactivatePassword"
            autoComplete="current-password"
            value={deactivatePassword}
            onChange={(event) => setDeactivatePassword(event.target.value)}
          />
        ) : (
          <p>该账号没有密码凭证，后端将按无密码账号流程处理。</p>
        )}
      </Modal>
    </SettingsPage>
  );
}
