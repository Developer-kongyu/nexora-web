import type {
  BlockedUserManagementListItemView,
  UserManagementListItemView,
  UserManagementPlaceholderReason,
} from '@/domains/users/model';

export type SafetyEntryKind = 'mute' | 'block';

export type SafetyManagementItem =
  | UserManagementListItemView
  | BlockedUserManagementListItemView;

const placeholderLabels: Record<UserManagementPlaceholderReason, string> = {
  USER_NOT_FOUND: '账号已不存在',
  HANDLE_MISSING: '账号 Handle 暂不可用',
  PROFILE_FACTS_UNAVAILABLE: '用户资料暂不可用',
  VISIBILITY_DENIED: '当前无权查看用户资料',
  USER_STATUS_NOT_ACTIVE: '账号当前不可用',
  ACCOUNT_DISABLED: '账号已停用',
  ENTRY_HIDDEN_BY_POLICY: '该条目已按策略隐藏',
  MODERATION_RESTRICTED: '该账号受到内容治理限制',
  MEMBERSHIP_CONTEXT_UNAVAILABLE: '账号上下文暂不可用',
  SELF_ONLY_SCOPE: '该条目仅账号本人可见',
};

export function safetyDisplayName(item: SafetyManagementItem): string {
  return item.displayName?.trim() || '不可用账号';
}

export function safetyHandleLabel(item: SafetyManagementItem): string {
  return item.handle ? `@${item.handle}` : 'Handle 不可用';
}

export function placeholderReasonLabel(
  reason: UserManagementPlaceholderReason | null,
): string {
  return reason ? placeholderLabels[reason] : '用户资料暂不可用';
}

export function muteScopeLabel(item: UserManagementListItemView): string {
  if (!item.muted) return '静音范围暂不可用';
  if (item.muted.mutePosts && item.muted.muteNotifications) return '已静音帖子与通知';
  if (item.muted.mutePosts) return '已静音帖子';
  if (item.muted.muteNotifications) return '已静音通知';
  return '静音记录待同步';
}

export function filterSafetyItems<T extends SafetyManagementItem>(
  items: T[],
  keyword: string,
): T[] {
  const normalized = keyword.trim().toLocaleLowerCase('zh-CN');
  if (!normalized) return items;
  return items.filter((item) => {
    const profileFields =
      item.cardState === 'FULL' ? [item.displayName, item.handle, item.bio] : [];
    const placeholderFields =
      item.cardState === 'PLACEHOLDER' && item.placeholderReason
        ? [placeholderReasonLabel(item.placeholderReason)]
        : [];
    const searchable = [...profileFields, ...placeholderFields]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLocaleLowerCase('zh-CN');
    return searchable.includes(normalized);
  });
}

export function canCancelSafetyEntry(
  kind: SafetyEntryKind,
  item: SafetyManagementItem,
): boolean {
  if (!item.handle) return false;
  if (kind === 'block' && 'canUnblock' in item) return item.canUnblock;
  return true;
}
