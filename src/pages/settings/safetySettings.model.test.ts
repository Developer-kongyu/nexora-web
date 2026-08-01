import type {
  BlockedUserManagementListItemView,
  UserManagementListItemView,
} from '@/domains/users/model';
import {
  canCancelSafetyEntry,
  filterSafetyItems,
  muteScopeLabel,
  placeholderReasonLabel,
  safetyDisplayName,
  safetyHandleLabel,
} from './safetySettings.model';

function mutedItem(patch: Partial<UserManagementListItemView> = {}): UserManagementListItemView {
  return {
    userId: 'u-1',
    handle: 'quiet_user',
    displayName: '安静用户',
    bio: '旅行记录',
    avatarUrl: null,
    relationship: null,
    cardState: 'FULL',
    placeholderReason: null,
    followedAt: null,
    followRequestId: null,
    muted: { mutePosts: true, muteNotifications: true },
    blocked: false,
    ...patch,
  };
}

function blockedItem(
  patch: Partial<BlockedUserManagementListItemView> = {},
): BlockedUserManagementListItemView {
  return {
    ...mutedItem({ muted: null, blocked: true }),
    canUnblock: true,
    ...patch,
  };
}

describe('safety settings model', () => {
  it('renders mute scope from canonical flags', () => {
    expect(muteScopeLabel(mutedItem())).toBe('已静音帖子与通知');
    expect(
      muteScopeLabel(mutedItem({ muted: { mutePosts: true, muteNotifications: false } })),
    ).toBe('已静音帖子');
    expect(
      muteScopeLabel(mutedItem({ muted: { mutePosts: false, muteNotifications: true } })),
    ).toBe('已静音通知');
  });

  it('keeps placeholder entries understandable without inventing profile facts', () => {
    const item = blockedItem({
      handle: null,
      displayName: null,
      cardState: 'PLACEHOLDER',
      placeholderReason: 'ACCOUNT_DISABLED',
      canUnblock: false,
    });

    expect(safetyDisplayName(item)).toBe('不可用账号');
    expect(safetyHandleLabel(item)).toBe('Handle 不可用');
    expect(placeholderReasonLabel(item.placeholderReason)).toBe('账号已停用');
    expect(canCancelSafetyEntry('block', item)).toBe(false);
  });

  it('searches available profile fields and placeholder descriptions without leaking hidden facts', () => {
    const full = mutedItem();
    const placeholder = blockedItem({
      userId: 'u-2',
      handle: 'hidden_handle',
      displayName: '不应暴露的昵称',
      bio: '不应参与搜索的资料',
      cardState: 'PLACEHOLDER',
      placeholderReason: 'VISIBILITY_DENIED',
    });

    expect(filterSafetyItems([full, placeholder], '旅行')).toEqual([full]);
    expect(filterSafetyItems([full, placeholder], '无权查看')).toEqual([placeholder]);
    expect(filterSafetyItems([full, placeholder], 'hidden_handle')).toEqual([]);
    expect(filterSafetyItems([full, placeholder], '不应暴露')).toEqual([]);
  });
});
