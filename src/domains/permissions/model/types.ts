export const ACCOUNT_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;
export type AccountVisibility = (typeof ACCOUNT_VISIBILITIES)[number];

export type DefaultPostVisibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE' | 'UNLISTED';
export type InteractionPermission = 'EVERYONE' | 'FOLLOWING' | 'MUTUALS' | 'NO_ONE';
export type QuotePermission = 'EVERYONE' | 'FOLLOWING' | 'NO_ONE';
export type ConnectionListVisibility = 'EVERYONE' | 'FOLLOWERS' | 'SELF_ONLY';
export type BirthdayVisibility = 'HIDDEN' | 'FOLLOWERS' | 'EVERYONE';

export interface PermissionPolicy {
  accountVisibility: AccountVisibility;
  allowSearchIndex: boolean;
  defaultPostVisibility: DefaultPostVisibility;
  defaultLikePermission: InteractionPermission;
  defaultBookmarkPermission: InteractionPermission;
  defaultCommentPermission: InteractionPermission;
  defaultQuotePermission: QuotePermission;
  defaultRepostPermission: QuotePermission;
  mentionPermission: QuotePermission;
  followerListVisibility: ConnectionListVisibility;
  followingListVisibility: ConnectionListVisibility;
  birthdayVisibility: BirthdayVisibility;
}

export type PermissionPreview = PermissionPolicy;
