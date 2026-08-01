import {
  Bell,
  ChevronRight,
  LockKeyhole,
  Shield,
  SlidersHorizontal,
  UserRound,
  VolumeX,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { Badge, useToast } from '@/shared/ui';
import { PageTitle } from './PageParts';
import styles from './SettingsPage.module.css';

const SETTINGS_ITEMS = [
  { to: '/settings', label: '设置总览', icon: SlidersHorizontal, end: true },
  { to: '/settings/profile', label: '个人资料', icon: UserRound },
  { to: '/settings/account', label: '账号与安全', icon: LockKeyhole },
  { to: '/settings/privacy', label: '隐私设置', icon: Shield },
  { to: '/settings/notifications', label: '通知设置', icon: Bell },
  { to: '/settings/preferences', label: '推荐与兴趣', icon: SlidersHorizontal },
  { to: '/settings/safety', label: '屏蔽与静音', icon: VolumeX },
] as const;

interface SettingsPageProps {
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
}

export function SettingsPage({ title, description, children, aside }: SettingsPageProps) {
  return (
    <>
      <PageTitle title={title} description={description} />
      <div className={styles.layout}>
        <aside className={styles.nav}>
          <div className={styles.navTitle}>
            <strong>设置</strong>
            <Badge tone="success">已同步</Badge>
          </div>
          <nav>
            {SETTINGS_ITEMS.map(({ to, label, icon: Icon, ...linkProps }) => (
              <NavLink
                key={to}
                to={to}
                {...linkProps}
                className={({ isActive }) => cn(isActive && styles.active)}
              >
                <Icon size={17} />
                <span>{label}</span>
                <ChevronRight size={14} />
              </NavLink>
            ))}
          </nav>
          <p>设置会通过账号同步到你登录的所有设备。</p>
        </aside>
        <main>{children}</main>
        <aside className={styles.aside}>{aside ?? <DefaultAside />}</aside>
      </div>
    </>
  );
}

function DefaultAside() {
  const { showToast } = useToast();

  return (
    <>
      <section>
        <h2>设置提示</h2>
        <ul>
          <li>重要更改可能需要验证密码或验证码</li>
          <li>隐私和安全设置保存后立即生效</li>
          <li>设备会话可随时远程退出</li>
        </ul>
      </section>
      <section>
        <h2>需要帮助？</h2>
        <p>查看账号安全指南，或联系支持团队处理无法自行解决的问题。</p>
        <button
          type="button"
          onClick={() =>
            showToast({
              tone: 'info',
              title: '帮助中心已打开',
              description: '账号安全、隐私与申诉指南可在支持中心查看。',
            })
          }
        >
          打开帮助中心
        </button>
      </section>
    </>
  );
}
