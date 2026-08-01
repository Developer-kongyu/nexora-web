import type { CommunitySummary } from '@/domains/communities/model/types';
import type { NotificationItem } from '@/domains/notifications/model/types';
import type {
  PostDeletedListItemView,
  PostDraftListItemView,
  PostViewModel,
} from '@/domains/posts/model/types';
import type {
  UserManagementListItemView,
  UserProfile,
  UserProfileHeaderView,
  UserSummary,
} from '@/domains/users/model/types';

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

function requireUserFixture(handle: string): UserSummary {
  const user = users.find((candidate) => candidate.handle === handle);
  if (!user) throw new Error(`Missing mock user fixture: ${handle}`);
  return user;
}

const xiaoming = requireUserFixture('xiaoming');
const developerAqiang = requireUserFixture('aqiang_dev');
const productAssistant = requireUserFixture('pm_helper');

export const userProfileHeaders: Record<string, UserProfileHeaderView> = Object.fromEntries(
  users.map((user) => [
    user.handle,
    {
      userId: user.id,
      handle: user.handle,
      displayName: user.displayName,
      bio: user.bio ?? null,
      location: user.id === currentUser.id ? currentUser.location ?? null : null,
      websiteUrl: user.id === currentUser.id ? currentUser.website ?? null : null,
      birthday: null,
      avatarUrl: user.avatarUrl,
      coverUrl: user.id === currentUser.id ? currentUser.coverUrl : null,
      stats: {
        followersCount: user.followersCount ?? 0,
        followingCount: user.id === currentUser.id ? currentUser.followingCount ?? 0 : 0,
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

const permissions = { canComment: true, canLike: true, canRepost: true, canQuote: true };
const viewer = { liked: false, bookmarked: false, reposted: false };
export const posts: PostViewModel[] = [
  {
    id: 'post-1',
    author: xiaoming,
    createdAt: '2026-07-10T06:00:00.000Z',
    content: '周末的海边光线太好了，整理了一组照片和调色参数。你们更喜欢冷色还是暖色？',
    tags: ['摄影', '海边短片'],
    media: [
      {
        id: 'm-1',
        kind: 'image',
        url: '/media/coast.svg',
        alt: '海边光线调色对比',
        title: '海边光线的冷暖调色',
        description:
          '左侧是偏青绿色的清爽方案，右侧是偏暖黄色的落日方案。记录了曝光、色温、曲线和 HSL 的完整参数。',
      },
      {
        id: 'm-2',
        kind: 'image',
        url: '/media/workflow.svg',
        alt: '调色参数工作流',
        title: '从原片到成片的调色步骤',
        description: '先统一曝光与白平衡，再处理曲线、局部颜色和颗粒，最后按发布平台导出。',
      },
    ],
    stats: { comments: 24, likes: 156, reposts: 8, bookmarks: 12, shares: 9, views: 2400 },
    permissions,
    viewer,
    variant: 'feed',
  },
  {
    id: 'post-2',
    author: developerAqiang,
    createdAt: '2026-07-10T03:00:00.000Z',
    content:
      '今天把 CI 从 18 分钟压到了 7 分钟，核心是缓存分层和依赖安装拆分。附一份可以直接复用的检查清单。',
    tags: ['技术交流', 'CI'],
    media: [],
    stats: { comments: 18, likes: 94, reposts: 12, bookmarks: 6, shares: 4, views: 1300 },
    permissions,
    viewer,
    variant: 'feed',
  },
  {
    id: 'post-3',
    author: productAssistant,
    createdAt: '2026-07-09T06:00:00.000Z',
    content: '整理了一篇 PRD 到设计评审的协作模板，适合小团队快速对齐范围。',
    tags: ['产品设计'],
    media: [],
    linkPreview: {
      title: 'AI 产品体验报告：从提示词到工作流',
      description: '阅读约 6 分钟 · 适合产品 / 设计协作复盘',
      url: 'https://lct.design/news/workflow',
      imageUrl: '/media/workflow.svg',
    },
    stats: { comments: 11, likes: 68, reposts: 5, bookmarks: 23, shares: 12, views: 980 },
    permissions,
    viewer,
    variant: 'feed',
  },
];

export const communities: CommunitySummary[] = [
  {
    id: 'c-1',
    slug: 'ai-product',
    name: 'AI 产品讨论组',
    description: 'AI 产品、工作流、提示词与真实落地案例。',
    avatarUrl: null,
    membersCount: 12800,
    joined: true,
  },
  {
    id: 'c-2',
    slug: 'pm-lab',
    name: '产品经理交流圈',
    description: '需求、增长、路线图与团队协作。',
    avatarUrl: null,
    membersCount: 8700,
  },
  {
    id: 'c-3',
    slug: 'urban-photo',
    name: '城市摄影散步',
    description: '用照片记录街区、建筑和日常光线。',
    avatarUrl: null,
    membersCount: 4600,
  },
];

export const contentCenterDrafts: PostDraftListItemView[] = [
  {
    draftId: 'd-1',
    draftVersion: 4,
    state: 'EDITABLE',
    bodyTextPreview: '关于收藏功能的一些产品思考……',
    mediaCountProjection: 2,
    imageCountProjection: 2,
    videoCountProjection: 0,
    linkPreviewState: { state: 'NONE', card: null },
    updatedAtIso: '2026-07-10T05:42:00.000Z',
  },
  {
    draftId: 'd-2',
    draftVersion: 2,
    state: 'PUBLISH_FAILED_EDITABLE',
    bodyTextPreview: '社群冷启动：前三十天的内容节奏',
    mediaCountProjection: 0,
    imageCountProjection: 0,
    videoCountProjection: 0,
    linkPreviewState: {
      state: 'READY',
      card: {
        url: 'https://lct.design/community/cold-start',
        title: '社群冷启动内容节奏',
        description: '前三十天的内容运营检查清单。',
        siteName: 'LCT Design',
        previewImageUrl: null,
      },
    },
    updatedAtIso: '2026-07-09T12:20:00.000Z',
  },
];

export const notifications: NotificationItem[] = [
  {
    notificationId: 'n-1',
    streamSeq: '103',
    type: 'POST_COMMENTED',
    category: 'INTERACTION',
    readAt: null,
    createdAt: '2026-07-28T08:30:00.000Z',
    primaryText: '小明同学评论了你的帖子',
    secondaryText: '这个对比很清楚，能分享导出参数吗？',
    actor: {
      userId: 'u-xm',
      handle: 'xiaoming',
      displayName: '小明同学',
      avatarUrl: null,
    },
    entity: {
      entityType: 'POST',
      entityId: 'post-1',
      excerpt: '周末的海边光线太好了……',
      coverImageUrl: null,
      actionUrl: '/posts/post-1',
    },
    masked: false,
    maskedReasonCode: null,
  },
  {
    notificationId: 'n-2',
    streamSeq: '102',
    type: 'POST_LIKED',
    category: 'INTERACTION',
    readAt: null,
    createdAt: '2026-07-28T07:10:00.000Z',
    primaryText: '有 18 人点赞了你的帖子',
    secondaryText: '你发布的产品复盘获得了新的互动。',
    actor: null,
    entity: {
      entityType: 'POST',
      entityId: 'post-3',
      excerpt: 'PRD 到设计评审的协作模板',
      coverImageUrl: null,
      actionUrl: '/posts/post-3',
    },
    masked: false,
    maskedReasonCode: null,
  },
  {
    notificationId: 'n-3',
    streamSeq: '101',
    type: 'FOLLOWED',
    category: 'INTERACTION',
    readAt: '2026-07-27T11:30:00.000Z',
    createdAt: '2026-07-27T11:00:00.000Z',
    primaryText: '旅行记录本关注了你',
    secondaryText: '你们现在可以互相查看公开动态。',
    actor: {
      userId: 'u-travel',
      handle: 'travel_log',
      displayName: '旅行记录本',
      avatarUrl: null,
    },
    entity: {
      entityType: 'USER',
      entityId: 'u-travel',
      excerpt: null,
      coverImageUrl: null,
      actionUrl: '/users/travel_log',
    },
    masked: false,
    maskedReasonCode: null,
  },
  {
    notificationId: 'n-4',
    streamSeq: '100',
    type: 'AUTH_SECURITY_ALERT',
    category: 'SYSTEM',
    readAt: null,
    createdAt: '2026-07-27T09:00:00.000Z',
    primaryText: '检测到新的登录设备',
    secondaryText: '如非本人操作，请立即检查账号安全设置。',
    actor: null,
    entity: {
      entityType: 'SECURITY_SESSION',
      entityId: 'session-2',
      excerpt: null,
      coverImageUrl: null,
      actionUrl: '/settings/security',
    },
    masked: false,
    maskedReasonCode: null,
  },
];

export const deletedContent: PostDeletedListItemView[] = [
  {
    postId: 'deleted-post-1',
    postKind: 'ORIGINAL',
    bodyTextPreview: '已经删除的产品复盘内容',
    deletedAtIso: '2026-07-25T08:00:00.000Z',
  },
  {
    postId: 'deleted-post-2',
    postKind: 'REPLY',
    bodyTextPreview: '周末随手记录中的一条回复',
    deletedAtIso: '2026-07-15T08:00:00.000Z',
  },
];
