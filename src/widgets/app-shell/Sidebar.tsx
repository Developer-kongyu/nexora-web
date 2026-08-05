import {
  Bell,
  Bookmark,
  ChevronRight,
  Clock3,
  Compass,
  FolderOpen,
  Home,
  LogOut,
  PenSquare,
  Settings,
  UserRound,
  Users,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useLogout } from '@/domains/auth';
import { useUnreadSummary } from '@/domains/notifications';
import { getCurrentUserPresentation } from '@/domains/users';
import { APP_BRAND } from '@/shared/config/brand';
import { paths } from '@/shared/config/paths';
import { cn } from '@/shared/lib/cn';
import { Avatar, Badge, BrandMark, Button } from '@/shared/ui';
import styles from './Sidebar.module.css';

type NavigationTarget = string | ((profilePath: string) => string);

interface NavigationDefinition {
  to: NavigationTarget;
  label: string;
  icon: typeof Home;
}

const NAVIGATION_DEFINITIONS = {
  home: { to: paths.home, label: '首页', icon: Home },
  explore: { to: paths.explore, label: '发现', icon: Compass },
  communities: { to: paths.communities, label: '社群', icon: Users },
  notifications: { to: paths.notifications, label: '通知', icon: Bell },
  bookmarks: { to: paths.bookmarks, label: '收藏夹', icon: Bookmark },
  content: { to: paths.content, label: '内容中心', icon: FolderOpen },
  history: { to: paths.history, label: '浏览历史', icon: Clock3 },
  profile: {
    to: (profilePath: string) => profilePath,
    label: '个人主页',
    icon: UserRound,
  },
  settings: { to: paths.settings, label: '设置', icon: Settings },
  compose: { to: paths.compose, label: '发布', icon: PenSquare },
} satisfies Record<string, NavigationDefinition>;

type NavigationKey = keyof typeof NAVIGATION_DEFINITIONS;

interface NavigationItem extends Omit<NavigationDefinition, 'to'> {
  to: string;
  badge?: number | string;
}

const MAIN_NAVIGATION_KEYS = [
  'home',
  'explore',
  'communities',
  'notifications',
] as const satisfies readonly NavigationKey[];
const LIBRARY_NAVIGATION_KEYS = [
  'bookmarks',
  'content',
  'history',
] as const satisfies readonly NavigationKey[];
const SECONDARY_NAVIGATION_KEYS = [
  'profile',
  'settings',
] as const satisfies readonly NavigationKey[];
const MOBILE_NAVIGATION_KEYS = [
  'home',
  'explore',
  'compose',
  'notifications',
  'profile',
] as const satisfies readonly NavigationKey[];

function resolveNavigationTarget(target: NavigationTarget, profilePath: string) {
  return typeof target === 'function' ? target(profilePath) : target;
}

function buildNavigationItems(
  keys: readonly NavigationKey[],
  profilePath: string,
  badges: Partial<Record<NavigationKey, number | string>> = {},
): NavigationItem[] {
  return keys.map((key) => {
    const definition = NAVIGATION_DEFINITIONS[key];

    return {
      ...definition,
      to: resolveNavigationTarget(definition.to, profilePath),
      badge: badges[key],
    };
  });
}

function formatUnreadCount(count: number): number | string | undefined {
  if (count <= 0) return undefined;
  return count > 99 ? '99+' : count;
}

function Logo() {
  return (
    <NavLink className={styles.brand} to={paths.home} aria-label={`${APP_BRAND.name} 首页`}>
      <BrandMark className={styles.logoMark} />
      <span>
        <strong>{APP_BRAND.name}</strong>
        <small>{APP_BRAND.tagline}</small>
      </span>
    </NavLink>
  );
}

interface NavGroupProps {
  label?: string;
  items: readonly NavigationItem[];
}

function NavGroup({ label, items }: NavGroupProps) {
  return (
    <div className={styles.group}>
      {label ? <p className={styles.groupLabel}>{label}</p> : null}
      <nav>
        {items.map(({ to, label: itemLabel, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(styles.navItem, isActive && styles.active)}
          >
            <Icon size={19} strokeWidth={1.9} />
            <span>{itemLabel}</span>
            {badge !== undefined ? (
              <Badge tone="danger" className={styles.badge}>
                {badge}
              </Badge>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const logout = useLogout();
  const unreadSummary = useUnreadSummary();
  const currentUser = getCurrentUserPresentation(user);
  const mainNavigation = buildNavigationItems(MAIN_NAVIGATION_KEYS, currentUser.profilePath, {
    notifications: formatUnreadCount(unreadSummary.data?.totalUnreadCount ?? 0),
  });
  const libraryNavigation = buildNavigationItems(LIBRARY_NAVIGATION_KEYS, currentUser.profilePath);
  const secondaryNavigation = buildNavigationItems(
    SECONDARY_NAVIGATION_KEYS,
    currentUser.profilePath,
  );

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      void navigate(paths.login, { replace: true });
    }
  };

  return (
    <aside className={styles.sidebar}>
      <Logo />
      <Button className={styles.compose} size="lg" onClick={() => navigate(paths.compose)}>
        <PenSquare size={18} />
        <span>发布帖子</span>
      </Button>

      <div className={styles.navigation}>
        <NavGroup items={mainNavigation} />
        <NavGroup label="我的" items={libraryNavigation} />
        <NavGroup items={secondaryNavigation} />
      </div>

      <section className={styles.proCard}>
        <span className={styles.proIcon}>✦</span>
        <div>
          <strong>创作者计划 Pro</strong>
          <p>解锁数据洞察与更多创作工具</p>
        </div>
        <button type="button" onClick={() => navigate(paths.settings)}>
          查看权益
          <ChevronRight size={14} />
        </button>
      </section>

      <div className={styles.account}>
        <Avatar
          fallback={currentUser.avatarFallback}
          alt={currentUser.displayName}
          src={user?.avatarUrl}
        />
        <span>
          <strong>{currentUser.displayName}</strong>
          <small>{currentUser.handle ? `@${currentUser.handle}` : '资料加载中'}</small>
        </span>
        <button
          type="button"
          title="退出登录"
          aria-label="退出登录"
          aria-busy={logout.isPending}
          disabled={logout.isPending}
          onClick={() => void handleLogout()}
        >
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  );
}

export function MobileNavigation() {
  const user = useAuthStore((state) => state.user);
  const currentUser = getCurrentUserPresentation(user);
  const items = buildNavigationItems(MOBILE_NAVIGATION_KEYS, currentUser.profilePath);

  return (
    <nav className={styles.mobileNav} aria-label="移动端主导航">
      {items.map(({ to, label, icon: Icon }) => {
        const primary = to === paths.compose;

        return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(primary && styles.mobilePrimary, isActive && styles.mobileActive)
            }
          >
            <Icon size={primary ? 23 : 20} />
            <span>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
