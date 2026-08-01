import type { PublicPrivateVisibility } from '@/shared/model/visibility';

export type ProfileVisibility = PublicPrivateVisibility;

export const PERMISSION_AUDIENCES = ['everyone', 'following', 'none'] as const;
export type PermissionAudience = (typeof PERMISSION_AUDIENCES)[number];

export const COMMENT_PERMISSION_AUDIENCES = [
  'everyone',
  'following',
  'followers',
  'none',
] as const;
export type CommentPermissionAudience = (typeof COMMENT_PERMISSION_AUDIENCES)[number];

export const MESSAGE_PERMISSION_AUDIENCES = ['following', 'mutual', 'none'] as const;
export type MessagePermissionAudience = (typeof MESSAGE_PERMISSION_AUDIENCES)[number];

export interface PermissionPolicy {
  profileVisibility: ProfileVisibility;
  showOnlineStatus: boolean;
  showConnections: boolean;
  discoverByEmail: boolean;
  discoverByPhone: boolean;
  searchEngineIndexing: boolean;
  allowComments: CommentPermissionAudience;
  allowMentions: PermissionAudience;
  allowQuotes: PermissionAudience;
  allowMessages: MessagePermissionAudience;
}

export interface PermissionPreview {
  profileSummary: string;
  interactionSummary: string;
  discoverySummary: string;
}
