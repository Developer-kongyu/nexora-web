import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Pin,
  Settings,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { COMMUNITY_MEMBER_ROLE_LABELS, type CommunityDetailView } from '@/domains/communities';
import { Avatar, Badge } from '@/shared/ui';
import type { CommunityManageSection } from './communityManage.model';
import styles from './CommunityManagePage.module.css';

interface NavItem {
  id: CommunityManageSection;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

const navigation: NavItem[] = [
  { id: 'overview', label: '概览', icon: LayoutDashboard },
  { id: 'requests', label: '加入申请', icon: UserCheck },
  { id: 'members', label: '成员与角色', icon: UsersRound },
  { id: 'pinned', label: '置顶与公告', icon: Pin },
  { id: 'rules', label: '社群规则', icon: BookOpen },
  { id: 'logs', label: '操作日志', icon: ClipboardList },
  { id: 'settings', label: '权限设置', icon: Settings },
];

interface CommunityManageSidebarProps {
  detail: CommunityDetailView;
  active: CommunityManageSection;
  availableSections: readonly CommunityManageSection[];
  pendingRequestCount: number;
  onSelect: (section: CommunityManageSection) => void;
}

export function CommunityManageSidebar({
  detail,
  active,
  availableSections,
  pendingRequestCount,
  onSelect,
}: CommunityManageSidebarProps) {
  const community = detail.community;
  const visibleNavigation = navigation.filter((item) => availableSections.includes(item.id));

  return (
    <aside className={styles.sidebar}>
      <div className={styles.communityIdentity}>
        <Avatar
          size="lg"
          src={community.avatarUrl ?? undefined}
          fallback={community.name.slice(0, 1)}
          alt={community.name}
        />
        <div>
          <strong>{community.name}</strong>
          <span>
            {detail.viewerContext?.actorRole === 'VISITOR'
              ? '访客'
              : COMMUNITY_MEMBER_ROLE_LABELS[detail.viewerContext?.actorRole ?? 'MEMBER']}{' '}
            · 管理工作区
          </span>
        </div>
      </div>
      <nav aria-label="社群管理导航">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const badge = item.id === 'requests' ? pendingRequestCount : 0;
          return (
            <button
              key={item.id}
              type="button"
              data-active={active === item.id}
              aria-current={active === item.id ? 'page' : undefined}
              onClick={() => onSelect(item.id)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {badge > 0 ? <Badge tone="danger">{badge}</Badge> : <span />}
              <ChevronRight size={14} />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
