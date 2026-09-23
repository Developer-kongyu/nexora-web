import type {
  UserManagementListItemView,
  UserProfile,
  UserProfileHeaderView,
  UserSummary,
} from '@/domains/users/model';

export const currentUser: UserProfile = {
  id: 'user-current',
  handle: 'zhiqiu',
  displayName: '林知夏',
  avatarUrl: null,
  bio: '产品设计师，记录社交产品、AI 工作流和城市生活。',
  coverUrl: null,
  location: '上海',
  website: 'https://lct.design',
  joinedAt: '2025-02-01T08:00:00.000Z',
  followersCount: 1280,
  followingCount: 286,
  postsCount: 148,
};

export const users: UserSummary[] = [
  currentUser,
  {
    id: 'u-xm',
    handle: 'xiaoming',
    displayName: '小明同学',
    avatarUrl: null,
    bio: '摄影、产品与海边短片',
    followersCount: 2140,
    isFollowing: true,
  },
  {
    id: 'u-dev',
    handle: 'aqiang_dev',
    displayName: '程序员阿强',
    avatarUrl: null,
    bio: '前端工程、CI 与性能',
    followersCount: 893,
  },
  {
    id: 'u-travel',
    handle: 'travel_log',
    displayName: '旅行记录本',
    avatarUrl: null,
    bio: '城市漫游、胶片摄影、路线分享',
    followersCount: 6900,
  },
  {
    id: 'u-pm',
    handle: 'pm_helper',
    displayName: '产品小助手',
    avatarUrl: null,
    bio: 'PRD 与产品协作模板',
    followersCount: 4320,
  },
];

export function requireUserFixture(handle: string): UserSummary {
  const user = users.find((candidate) => candidate.handle === handle);
  if (!user) throw new Error(`Missing mock user fixture: ${handle}`);
  return user;
}

export const userProfileHeaders: Record<string, UserProfileHeaderView> = Object.fromEntries(
  users.map((user) => [
    user.handle,
    {
      userId: user.id,
      handle: user.handle,
      displayName: user.displayName,
      bio: user.bio ?? null,
      location: user.id === currentUser.id ? (currentUser.location ?? null) : null,
      websiteUrl: user.id === currentUser.id ? (currentUser.website ?? null) : null,
      birthday: null,
      avatarUrl: user.avatarUrl,
      coverUrl: user.id === currentUser.id ? currentUser.coverUrl : null,
      stats: {
        followersCount: user.followersCount ?? 0,
        followingCount: user.id === currentUser.id ? (currentUser.followingCount ?? 0) : 0,
      },
      pinnedPostIds: user.id === currentUser.id ? ['post-1'] : [],
      relationship:
        user.id === currentUser.id
          ? {
              viewerUserId: currentUser.id,
              targetUserId: user.id,
              isSelf: true,
              following: false,
              followedBy: false,
              outgoingFollowRequestPending: false,
              incomingFollowRequestPending: false,
              mutePosts: false,
              muteNotifications: false,
              blockedByViewer: false,
              blockedByTarget: false,
              summary: 'SELF' as const,
            }
          : {
              viewerUserId: currentUser.id,
              targetUserId: user.id,
              isSelf: false,
              following: Boolean(user.isFollowing),
              followedBy: user.handle === 'travel_log',
              outgoingFollowRequestPending: false,
              incomingFollowRequestPending: false,
              mutePosts: false,
              muteNotifications: false,
              blockedByViewer: false,
              blockedByTarget: false,
              summary: user.isFollowing ? ('FOLLOWING' as const) : ('NONE' as const),
            },
      profileVersion: 3,
    },
  ]),
);

export const incomingFollowRequests: UserManagementListItemView[] = [
  {
    userId: 'u-request-1',
    handle: 'dev_zhou',
    displayName: '独立开发者小周',
    bio: '独立开发、产品出海与自动化工作流。',
    avatarUrl: null,
    relationship: null,
    cardState: 'FULL',
    placeholderReason: null,
    followedAt: null,
    followRequestId: 'follow-request-1',
    muted: null,
    blocked: false,
  },
  {
    userId: 'u-request-2',
    handle: 'ai_note',
    displayName: 'AI 研究笔记',
    bio: '关注模型评测与应用研究。',
    avatarUrl: null,
    relationship: null,
    cardState: 'FULL',
    placeholderReason: null,
    followedAt: null,
    followRequestId: 'follow-request-2',
    muted: null,
    blocked: false,
  },
];
