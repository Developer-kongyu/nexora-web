import { OnboardingSelection, type OnboardingOption } from './OnboardingSelection';

const INTEREST_OPTIONS = [
  {
    id: 'ai',
    title: '人工智能',
    description: '产品、模型与工作流',
    tone: 'purple',
  },
  {
    id: 'design',
    title: '产品设计',
    description: '体验、研究与设计系统',
    tone: 'cyan',
  },
  {
    id: 'photo',
    title: '摄影',
    description: '城市、街拍与后期',
    tone: 'green',
  },
  {
    id: 'dev',
    title: '软件开发',
    description: '前端、后端与工程效率',
    tone: 'pink',
  },
  {
    id: 'travel',
    title: '旅行',
    description: '路线、记录与在地体验',
    tone: 'orange',
  },
  {
    id: 'writing',
    title: '阅读与写作',
    description: '书籍、长文与创作',
    tone: 'purple',
  },
  {
    id: 'music',
    title: '音乐',
    description: '现场、器乐与制作',
    tone: 'cyan',
  },
  {
    id: 'fitness',
    title: '健康生活',
    description: '运动、饮食与习惯',
    tone: 'green',
  },
] satisfies OnboardingOption[];

export function InterestsPage() {
  return (
    <OnboardingSelection
      title="选择感兴趣的话题"
      description="选择至少 3 个，用于生成首批内容与社群推荐。"
      options={INTEREST_OPTIONS}
      nextPath="/onboarding/follow"
    />
  );
}
