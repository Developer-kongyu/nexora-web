import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  ChevronRight,
  KeyRound,
  Laptop,
  Shield,
  SlidersHorizontal,
  UserRound,
  VolumeX,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/domains/auth';
import { settingsApi, settingsKeys } from '@/domains/settings';
import { getCurrentUserPresentation } from '@/domains/users';
import { paths } from '@/shared/config/paths';
import { Badge, Card } from '@/shared/ui';
import { SettingsPage } from '../_shared/SettingsPage';
import styles from './SettingsPages.module.css';

const SETTINGS_ITEMS = [
  {
    to: paths.settingsAccount,
    title: '账号与安全',
    description: '邮箱、手机号、密码和设备会话',
    icon: KeyRound,
    tone: 'purple',
  },
  {
    to: paths.settingsPrivacy,
    title: '隐私设置',
    description: '账号可见性、评论与引用权限',
    icon: Shield,
    tone: 'cyan',
  },
  {
    to: paths.settingsNotifications,
    title: '通知设置',
    description: '站内、邮件与社群通知偏好',
    icon: Bell,
    tone: 'pink',
  },
  {
    to: paths.settingsPreferences,
    title: '推荐与兴趣',
    description: '兴趣标签、地区与个性化推荐',
    icon: SlidersHorizontal,
    tone: 'green',
  },
  {
    to: `${paths.settingsAccount}#devices`,
    title: '设备与登录',
    description: '查看活跃设备并远程退出',
    icon: Laptop,
    tone: 'orange',
  },
  {
    to: paths.settingsSafety,
    title: '屏蔽与静音',
    description: '管理被屏蔽、静音的账号和内容',
    icon: VolumeX,
    tone: 'purple',
  },
] as const;

export function SettingsOverviewPage() {
  const user = useAuthStore((state) => state.user);
  const query = useQuery({
    queryKey: settingsKeys.overview,
    queryFn: settingsApi.overview,
  });
  const currentUser = getCurrentUserPresentation(user);
  const overview = query.data;
  const syncState = query.isPending
    ? {
        title: '正在同步设置摘要',
        description: '正在读取当前账号的设置状态。',
        badge: '同步中',
        tone: 'neutral' as const,
      }
    : query.isError || !overview
      ? {
          title: '设置摘要同步失败',
          description: '请检查网络后刷新页面；现有服务端设置不会被覆盖。',
          badge: '需要重试',
          tone: 'warning' as const,
        }
      : {
          title: '所有设置均已同步',
          description: '后续变更会自动同步到当前账号。',
          badge: '最新',
          tone: 'success' as const,
        };

  const aside = (
    <>
      <section className={styles.accountSummary}>
        <div>
          <span>
            <UserRound size={18} />
          </span>
          <div>
            <strong>{currentUser.displayName}</strong>
            <small>{currentUser.handle ? `@${currentUser.handle}` : '资料加载中'}</small>
          </div>
        </div>
        <dl>
          <div>
            <dt>账号状态</dt>
            <dd>
              <Badge tone="success">正常</Badge>
            </dd>
          </div>
          <div>
            <dt>个人资料</dt>
            <dd>
              <Link to={paths.settingsProfile}>查看与完善</Link>
            </dd>
          </div>
          <div>
            <dt>双重验证</dt>
            <dd>暂未开放</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2>当前摘要</h2>
        {query.isPending ? (
          <p>正在读取设置…</p>
        ) : query.isError || !overview ? (
          <p>设置摘要暂不可用，请稍后刷新。</p>
        ) : (
          <ul>
            <li>通知：{overview.notificationEnabled ? '已开启' : '已关闭'}</li>
            <li>账号：{overview.privateAccount ? '私密' : '公开'}</li>
            <li>推荐：{overview.recommendationEnabled ? '个性化' : '基础模式'}</li>
          </ul>
        )}
      </section>
    </>
  );

  return (
    <SettingsPage
      title="设置"
      description="管理账号、隐私、通知、推荐偏好与内容安全。"
      aside={aside}
    >
      <div className={styles.overviewGrid}>
        {SETTINGS_ITEMS.map(({ to, title, description, icon: Icon, tone }) => (
          <Link key={title} to={to}>
            <Card className={styles.overviewCard} data-tone={tone}>
              <span>
                <Icon size={21} />
              </span>
              <h2>{title}</h2>
              <p>{description}</p>
              <ChevronRight className={styles.arrow} size={18} />
            </Card>
          </Link>
        ))}
      </div>

      <Card className={styles.syncBanner}>
        <span>
          <Laptop size={20} />
        </span>
        <div>
          <strong>{syncState.title}</strong>
          <p>{syncState.description}</p>
        </div>
        <Badge tone={syncState.tone}>{syncState.badge}</Badge>
      </Card>
    </SettingsPage>
  );
}
