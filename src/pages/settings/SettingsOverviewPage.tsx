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
import { settingsApi, settingsKeys } from '@/domains/settings';
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
    description: '站内、邮件、短信与社群通知偏好',
    icon: Bell,
    tone: 'pink',
  },
  {
    to: paths.settingsPreferences,
    title: '推荐与兴趣',
    description: '兴趣标签、语言地区、推荐与搜索',
    icon: SlidersHorizontal,
    tone: 'green',
  },
  {
    to: paths.settingsAccount + '#devices',
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
  const query = useQuery({
    queryKey: settingsKeys.overview,
    queryFn: settingsApi.overview,
  });
  const overview = query.data;
  const syncState = query.isPending
    ? {
        title: '正在读取设置摘要',
        description: '账号设置正在从服务端加载。',
        badge: '加载中',
        tone: 'neutral' as const,
      }
    : query.isError || !overview
      ? {
          title: '设置摘要加载失败',
          description: '页面未使用前端默认值，请检查服务后重试。',
          badge: '需要重试',
          tone: 'warning' as const,
        }
      : {
          title: '设置摘要来自服务端',
          description: '当前展示与账号的服务端状态一致。',
          badge: '已读取',
          tone: 'success' as const,
        };

  const aside = (
    <>
      <section className={styles.accountSummary}>
        {overview ? (
          <>
            <div>
              <span>
                <UserRound size={18} />
              </span>
              <div>
                <strong>{overview.profile.displayName}</strong>
                <small>@{overview.profile.handle}</small>
              </div>
            </div>
            <dl>
              <div>
                <dt>账号状态</dt>
                <dd>
                  <Badge tone="success">
                    {overview.account.status === 'ACTIVE' ? '正常' : overview.account.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt>活跃设备</dt>
                <dd>{overview.account.activeSessionCount} 台</dd>
              </div>
              <div>
                <dt>个人资料</dt>
                <dd>
                  <Link to={paths.settingsProfile}>查看与完善</Link>
                </dd>
              </div>
            </dl>
          </>
        ) : query.isPending ? (
          <p>正在读取账号摘要…</p>
        ) : (
          <p>账号摘要暂不可用。</p>
        )}
      </section>

      <section>
        <h2>当前摘要</h2>
        {overview ? (
          <ul>
            <li>站内通知：{overview.notification.inAppChannelEnabled ? '开启' : '关闭'}</li>
            <li>
              账号可见性：{overview.privacy.accountVisibility === 'PRIVATE' ? '私密' : '公开'}
            </li>
            <li>
              个性化推荐：
              {overview.recommendation.allowPersonalizedRecommendation ? '开启' : '关闭'}
            </li>
            <li>兴趣标签：{overview.recommendation.interestTagCount} 个</li>
          </ul>
        ) : (
          <p>摘要只会在服务端成功响应后显示。</p>
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
