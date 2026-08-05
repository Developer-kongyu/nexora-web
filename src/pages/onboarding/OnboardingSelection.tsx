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

const PRESENTATION = {
  interest: { icon: Sparkles, step: '01', summaryTitle: '让内容更懂你', initialSelectionCount: 3 },
  user: { icon: UsersRound, step: '02', summaryTitle: '从真实的人开始', initialSelectionCount: 2 },
  community: {
    icon: Compass,
    step: '03',
    summaryTitle: '找到长期交流的空间',
    initialSelectionCount: 2,
  },
} as const;

interface OnboardingSelectionProps {
  title: string;
  description?: string;
  options: OnboardingOption[];
  nextPath: string;
  skipPath?: string;
  final?: boolean;
  kind?: OnboardingKind;
  loading?: boolean;
  error?: string | null;
  minSelection?: number;
  onSubmit?: (selectedIds: string[]) => Promise<void>;
  onSkip?: () => Promise<void>;
}

export function OnboardingSelection({
  title,
  description,
  options,
  nextPath,
  skipPath,
  final = false,
  kind = 'interest',
  loading = false,
  error = null,
  minSelection = 0,
  onSubmit,
  onSkip,
}: OnboardingSelectionProps) {
  const presentation = PRESENTATION[kind];
  const [selected, setSelected] = useState<string[]>(() =>
    options.slice(0, presentation.initialSelectionCount).map((item) => item.id),
  );
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const navigate = useNavigate();
  const Icon = presentation.icon;

  const run = async (action: () => Promise<void>, destination = nextPath) => {
    setSubmitting(true);
    setLocalError(null);
    try {
      await action();
      void navigate(destination, { replace: final });
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = () =>
    run(async () => {
      if (selected.length < minSelection) throw new Error(`请至少选择 ${minSelection} 项`);
      await onSubmit?.(selected);
    });
  const skip = () =>
    run(async () => {
      await onSkip?.();
    }, skipPath);

  return (
    <div className={styles.content}>
      <section className={styles.selection}>
        <header>
          <span className={styles.headerIcon}>
            <Icon size={22} />
          </span>
          <div>
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
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
                onClick={() => setSelected((items) => toggleArrayValue(items, item.id))}
                aria-pressed={active}
                disabled={loading || submitting}
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
        {loading ? <p>正在读取推荐结果…</p> : null}
        {error || localError ? <p role="alert">{error ?? localError}</p> : null}
        <footer>
          <div>
            <Button variant="ghost" disabled={loading || submitting} onClick={() => void skip()}>
              跳过
            </Button>
          </div>
          <div>
            <Button
              loading={submitting}
              disabled={loading || selected.length < minSelection}
              onClick={() => void submit()}
            >
              {final ? '进入首页' : '下一步'}
            </Button>
          </div>
        </footer>
      </section>
      <aside className={styles.summary}>
        <span className={styles.summaryIcon}>
          <Icon size={22} />
        </span>
        <span className={styles.step}>STEP {presentation.step}</span>
        <h2>{presentation.summaryTitle}</h2>
        <p>你的选择只用于推荐和关系建立，并由服务端保存当前引导进度。</p>
        <div className={styles.count}>
          <strong>{selected.length}</strong>
          <span>已选择</span>
        </div>
      </aside>
    </div>
  );
}
