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
          <p>保存成功的设置会通过账号同步到登录设备。</p>
        </aside>
        <main>{children}</main>
        <aside className={styles.aside}>{aside ?? <DefaultAside />}</aside>
      </div>
    </>
  );
}

function DefaultAside() {
  return (
    <>
      <section>
        <h2>设置提示</h2>
        <ul>
          <li>页面中的账号状态与开关均读取自服务端</li>
          <li>重要更改可能要求当前密码或验证码</li>
          <li>设备会话可以在账号安全页远程退出</li>
        </ul>
      </section>
      <section>
        <h2>数据说明</h2>
        <p>加载失败时页面不会使用示例账号、示例设备或前端默认值替代服务端数据。</p>
      </section>
    </>
  );
}
