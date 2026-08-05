import type { CommunityDetailView, CommunityPermissionRole } from '@/domains/communities/model';
import { formatDateTime as formatSharedDateTime } from '@/shared/lib/format';

export interface CommunityManageSectionProps {
  communityId: string;
}

export interface CommunityManageDetailSectionProps extends CommunityManageSectionProps {
  detail: CommunityDetailView;
}

export const communityManageSections = [
  'overview',
  'requests',
  'members',
  'pinned',
  'rules',
  'logs',
  'settings',
] as const;

export type CommunityManageSection = (typeof communityManageSections)[number];

export interface CommunityManageAccess {
  sections: readonly CommunityManageSection[];
  canChangeMemberRoles: boolean;
  canRemoveMembers: boolean;
}

export function isCommunityManageSection(
  value: string | undefined,
): value is CommunityManageSection {
  return communityManageSections.includes(value as CommunityManageSection);
}

function isAdministrator(role: CommunityPermissionRole): boolean {
  return role === 'ADMIN' || role === 'OWNER';
}

export function getCommunityManageAccess(detail: CommunityDetailView): CommunityManageAccess {
  const context = detail.viewerContext;
  if (!context?.canManageCommunity) {
    return { sections: [], canChangeMemberRoles: false, canRemoveMembers: false };
  }

  const administrator = isAdministrator(context.actorRole);
  const sections: CommunityManageSection[] = ['overview'];
  if (context.canReviewJoinRequests) sections.push('requests');
  sections.push('members');
  if (context.canPinPost) sections.push('pinned');
  if (administrator) sections.push('rules');
  sections.push('logs');
  if (administrator) sections.push('settings');

  return {
    sections,
    canChangeMemberRoles: administrator,
    canRemoveMembers: true,
  };
}

export function formatCommunityManageDateTime(value: string | null): string {
  if (!value) return '暂无';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? formatSharedDateTime(date) : '时间未知';
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
