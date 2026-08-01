import type { CommunityDetailView } from '@/domains/communities/model';
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
  'content',
  'pinned',
  'rules',
  'logs',
  'settings',
] as const;

export type CommunityManageSection = (typeof communityManageSections)[number];

export function isCommunityManageSection(value: string | undefined): value is CommunityManageSection {
  return communityManageSections.includes(value as CommunityManageSection);
}

export function formatCommunityManageDateTime(value: string | null): string {
  if (!value) return '暂无';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? formatSharedDateTime(date) : '时间未知';
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
