/**
 * 跨领域响应中可安全公开的最小用户身份投影。
 *
 * 帖子作者、通知动作人和用户列表均复用这一结构，避免各领域维护
 * 完全相同但容易漂移的 userId/handle/displayName/avatarUrl 定义。
 */
export interface UserIdentityBriefView {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}
