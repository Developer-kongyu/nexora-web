export type UserConnectionListKind = 'followers' | 'following';

export const userKeys = {
  all: ['users'] as const,
  profile: (handle: string) => ['users', handle] as const,
  profilePosts: (handle: string) => ['users', handle, 'posts'] as const,
  editableProfile: ['users', 'me', 'editable-profile'] as const,
  incomingFollowRequests: ['users', 'follow-requests', 'incoming'] as const,
  connectionList: (handle: string, kind: UserConnectionListKind) =>
    ['users', handle, kind] as const,
  mutes: ['users', 'me', 'mutes'] as const,
  blocks: ['users', 'me', 'blocks'] as const,
};
