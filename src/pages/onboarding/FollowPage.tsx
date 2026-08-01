import { OnboardingSelection, type OnboardingOption } from './OnboardingSelection';

const CREATOR_OPTIONS = [
  {
    id: 'xiaoming',
    title: '小明同学',
    description: '@xiaoming · 摄影与产品',
    meta: '2,140 位关注者 · 本周更新 4 篇',
    tone: 'cyan',
    initials: '明',
  },
  {
    id: 'aqiang',
    title: '程序员阿强',
    description: '@aqiang_dev · 工程效率',
    meta: '893 位关注者 · 前端与 CI 实践',
    tone: 'purple',
    initials: '强',
  },
  {
    id: 'travel',
    title: '旅行记录本',
    description: '@travel_log · 城市漫游',
    meta: '6,900 位关注者 · 胶片与路线',
    tone: 'green',
    initials: '旅',
  },
  {
    id: 'pm',
    title: '产品小助手',
    description: '@pm_helper · PRD 模板',
    meta: '4,320 位关注者 · 团队协作',
    tone: 'pink',
    initials: '产',
  },
] satisfies OnboardingOption[];

export function FollowPage() {
  return (
    <OnboardingSelection
      kind="user"
      title="关注一些优质创作者"
      description="点选整张卡片完成选择，首页会优先展示他们的更新。"
      options={CREATOR_OPTIONS}
      nextPath="/onboarding/communities"
    />
  );
}
