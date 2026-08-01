import { Check, Compass, Sparkles, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { toggleArrayValue } from '@/shared/lib/set';
import type { AccentTone } from '@/shared/model/presentation';
import { Avatar, Button } from '@/shared/ui';
import styles from './OnboardingSelection.module.css';

export interface OnboardingOption {
  id: string;
  title: string;
  description: string;
  tone: AccentTone;
  meta?: string;
  initials?: string;
}

type OnboardingKind = 'interest' | 'user' | 'community';

interface OnboardingPresentation {
  icon: typeof Sparkles;
  step: string;
  summaryTitle: string;
  summaryDescription: string;
  initialSelectionCount: number;
}

const ONBOARDING_PRESENTATION: Record<OnboardingKind, OnboardingPresentation> = {
  interest: {
    icon: Sparkles,
    step: '01',
    summaryTitle: '让内容更懂你',
    summaryDescription: '所选兴趣只用于推荐排序，随时可以在设置中调整。',
    initialSelectionCount: 4,
  },
  user: {
    icon: UsersRound,
    step: '02',
    summaryTitle: '从真实的人开始',
    summaryDescription: '我们优先推荐高质量、持续创作的账号。',
    initialSelectionCount: 2,
  },
  community: {
    icon: Compass,
    step: '03',
    summaryTitle: '找到长期交流的空间',
    summaryDescription: '加入社群后，会在首页看到精选讨论与公告。',
    initialSelectionCount: 2,
  },
};

interface OnboardingSelectionProps {
  title: string;
  description: string;
  options: OnboardingOption[];
  nextPath: string;
  final?: boolean;
  kind?: OnboardingKind;
}

export function OnboardingSelection({
  title,
  description,
  options,
  nextPath,
  final = false,
  kind = 'interest',
}: OnboardingSelectionProps) {
  const presentation = ONBOARDING_PRESENTATION[kind];
  const [selected, setSelected] = useState<string[]>(() =>
    options.slice(0, presentation.initialSelectionCount).map((item) => item.id),
  );
  const navigate = useNavigate();
  const Icon = presentation.icon;
  const continueOnboarding = () => navigate(nextPath);

  const toggle = (id: string) => {
    setSelected((items) => toggleArrayValue(items, id));
  };

  return (
    <div className={styles.content}>
      <section className={styles.selection}>
        <header>
          <span className={styles.headerIcon}>
            <Icon size={22} />
          </span>
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>

        <div className={cn(styles.grid, styles[kind])}>
          {options.map((item) => {
            const active = selected.includes(item.id);

            return (
              <button
                key={item.id}
                type="button"
                className={cn(styles.option, styles[item.tone], active && styles.selected)}
                onClick={() => toggle(item.id)}
                aria-pressed={active}
              >
                {kind !== 'interest' ? (
                  <Avatar
                    size={kind === 'community' ? 'lg' : 'md'}
                    fallback={item.initials || item.title.slice(0, 1)}
                    alt={item.title}
                  />
                ) : (
                  <span className={styles.topicMark}>{item.title.slice(0, 1)}</span>
                )}
                <span className={styles.copy}>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                  {item.meta ? <em>{item.meta}</em> : null}
                </span>
                <span className={styles.check}>
                  {active ? <Check size={17} strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <footer>
          <div>
            <Button variant="ghost" onClick={continueOnboarding}>
              跳过
            </Button>
            <Button variant="secondary" onClick={continueOnboarding}>
              完成
            </Button>
          </div>
          <div>
            <Button variant="secondary" onClick={continueOnboarding}>
              提交
            </Button>
            <Button onClick={continueOnboarding}>{final ? '进入首页' : '下一步'}</Button>
          </div>
        </footer>
      </section>

      <aside className={styles.summary}>
        <span className={styles.summaryIcon}>
          <Icon size={22} />
        </span>
        <span className={styles.step}>STEP {presentation.step}</span>
        <h2>{presentation.summaryTitle}</h2>
        <p>{presentation.summaryDescription}</p>
        <div className={styles.count}>
          <strong>{selected.length}</strong>
          <span>已选择</span>
        </div>
        <ul>
          <li>不会自动公开你的选择</li>
          <li>支持随时取消关注或退出</li>
          <li>推荐结果会持续学习调整</li>
        </ul>
      </aside>
    </div>
  );
}
