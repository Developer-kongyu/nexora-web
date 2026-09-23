import type {
  PostDeletedListItemView,
  PostDraftListItemView,
  PostViewModel,
} from '@/domains/posts/model';
import { requireUserFixture } from './users.fixture';

const xiaoming = requireUserFixture('xiaoming');

const developerAqiang = requireUserFixture('aqiang_dev');

const productAssistant = requireUserFixture('pm_helper');

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
