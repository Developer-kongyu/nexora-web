import type { CursorPage } from '@/shared/api/pagination';
import type { UserIdentityBriefView } from '@/shared/model/userIdentity';

export type NotificationCategory = 'MENTION' | 'INTERACTION' | 'COMMUNITY' | 'SYSTEM';

export type NotificationType =
  | 'FOLLOWED'
  | 'FOLLOW_REQUEST_RECEIVED'
  | 'FOLLOW_REQUEST_ACCEPTED'
  | 'POST_LIKED'
  | 'POST_COMMENTED'
  | 'COMMENT_REPLIED'
  | 'POST_QUOTED'
  | 'POST_REPOSTED'
  | 'MENTIONED_IN_POST'
  | 'COMMUNITY_JOIN_REQUEST_CREATED'
  | 'COMMUNITY_JOIN_REQUEST_APPROVED'
  | 'COMMUNITY_JOIN_REQUEST_REJECTED'
  | 'COMMUNITY_ROLE_CHANGED'
  | 'COMMUNITY_ANNOUNCEMENT'
  | 'MEDIA_PROCESSING_FAILED'
  | 'AUTH_SECURITY_ALERT'
  | 'SYSTEM';

export type NotificationListTab = 'ALL' | 'MENTIONS' | 'INTERACTIONS' | 'COMMUNITIES' | 'SYSTEM';

export interface ListNotificationsInput {
  tab?: NotificationListTab;
  unreadOnly?: boolean;
  cursor?: string | null;
  pageSize?: number;
}

export interface NotificationEntity {
  entityType: string;
  entityId: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  actionUrl: string | null;
}

export interface NotificationItem {
  notificationId: string;
  streamSeq: string;
  type: NotificationType;
  category: NotificationCategory;
  readAt: string | null;
  createdAt: string;
  primaryText: string;
  secondaryText: string | null;
  actor: UserIdentityBriefView | null;
  entity: NotificationEntity | null;
  masked: boolean;
  maskedReasonCode: string | null;
}

export interface NotificationListResponse extends CursorPage<NotificationItem> {
  degraded: boolean;
  degradedReason: string | null;
}

export interface UnreadSummary {
  totalUnreadCount: number;
  mentionUnreadCount: number;
  interactionUnreadCount: number;
  communityUnreadCount: number;
  systemUnreadCount: number;
}

export interface MarkNotificationsReadResult {
  updatedCount: number;
  lastReadAt: string;
}

export interface NotificationRealtimeBootstrap {
  summary: UnreadSummary;
  latestSeq: string;
}

export interface NotificationDeltaResponse {
  list: NotificationItem[];
  latestSeq: string;
  hasGap: boolean;
}

export interface NotificationTargetResolution {
  notificationId: string;
  actionUrl: string | null;
  available: boolean;
  unavailableReasonCode: string | null;
}
