import type { CommunitySummary } from '@/domains/communities/model';

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
