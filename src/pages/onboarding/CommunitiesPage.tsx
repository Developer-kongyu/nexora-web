import { OnboardingSelection, type OnboardingOption } from './OnboardingSelection';

const COMMUNITY_OPTIONS = [
  {
    id: 'ai-product',
    title: 'AI 产品讨论组',
    description: '工作流、提示词与真实案例',
    meta: '12.8k 成员 · 今日 86 条讨论',
    tone: 'purple',
    initials: 'AI',
  },
  {
    id: 'pm-lab',
    title: '产品经理交流圈',
    description: '需求、增长与路线图',
    meta: '8.7k 成员 · 每周精选复盘',
    tone: 'cyan',
    initials: '产',
  },
  {
    id: 'urban-photo',
    title: '城市摄影散步',
    description: '街区、建筑与日常光线',
    meta: '4.6k 成员 · 周末线下活动',
    tone: 'green',
    initials: '摄',
  },
  {
    id: 'frontend',
    title: '前端工程实践',
    description: '性能、架构与开发体验',
    meta: '6.1k 成员 · 高质量技术讨论',
    tone: 'pink',
    initials: '前',
  },
] satisfies OnboardingOption[];

export function CommunitiesPage() {
  return (
    <OnboardingSelection
      kind="community"
      title="加入推荐社群"
      description="选择适合长期交流的空间，随时可以退出。"
      options={COMMUNITY_OPTIONS}
      nextPath="/home"
      final
    />
  );
}
