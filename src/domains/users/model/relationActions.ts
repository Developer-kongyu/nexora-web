import type { UserFollowRelationshipWriteResult, UserRelationSnapshotView } from './types';

export const USER_RELATIONSHIP_ACTIONS = ['follow', 'unfollow', 'cancel-request'] as const;
export type UserRelationshipAction = (typeof USER_RELATIONSHIP_ACTIONS)[number];

export function resolveUserRelationshipAction(
  relationship: UserRelationSnapshotView | null,
): UserRelationshipAction | null {
  if (relationship?.isSelf || relationship?.blockedByViewer || relationship?.blockedByTarget) {
    return null;
  }
  if (relationship?.outgoingFollowRequestPending) return 'cancel-request';
  if (relationship?.following) return 'unfollow';
  return 'follow';
}

export function describeUserRelationshipActionResult(
  result: UserFollowRelationshipWriteResult,
): string {
  if (result.targetState === 'TARGET_NOT_FOUND') {
    return '操作已完成，账号资料暂不可用';
  }
  switch (result.actionResult) {
    case 'FOLLOWED':
      return '已关注该用户';
    case 'REQUEST_SUBMITTED':
      return '关注请求已发送';
    case 'ALREADY_FOLLOWING':
      return '你已关注该用户';
    case 'ALREADY_REQUESTED':
      return '关注请求仍在等待处理';
    case 'UNFOLLOWED':
      return '已取消关注';
    case 'NOOP_NOT_FOLLOWING':
      return '当前已经不是关注状态';
    case 'CANCELED':
      return '已取消关注请求';
    case 'NOOP_NOT_PENDING':
      return '关注请求已不在等待中';
  }
}
