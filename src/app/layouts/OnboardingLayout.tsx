import { ArrowLeft } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import styles from './OnboardingLayout.module.css';

const ONBOARDING_STEPS = [
  { path: '/onboarding/interests', label: '选择兴趣' },
  { path: '/onboarding/follow', label: '推荐关注' },
  { path: '/onboarding/communities', label: '加入社群' },
] as const;

export function OnboardingLayout() {
  const location = useLocation();
  const currentStepIndex = Math.max(
    0,
    ONBOARDING_STEPS.findIndex((step) => location.pathname === step.path),
  );
  const currentStepNumber = currentStepIndex + 1;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header>
          <Link className={styles.brand} to="/home">
            <span>L</span>
            <div>
              <strong>LCT Circle</strong>
              <small>个性化欢迎引导</small>
            </div>
          </Link>
          <div className={styles.stepLabel}>
            <strong>完善你的内容体验</strong>
            <span>
              第 {currentStepNumber} / {ONBOARDING_STEPS.length} 步
            </span>
          </div>
          <Link className={styles.exit} to="/home">
            <ArrowLeft size={16} />
            稍后完成
          </Link>
        </header>

        <div
          className={styles.progress}
          aria-label={`第 ${currentStepNumber} 步，共 ${ONBOARDING_STEPS.length} 步`}
        >
          {ONBOARDING_STEPS.map((step, index) => (
            <span
              key={step.path}
              data-state={
                index < currentStepIndex
                  ? 'done'
                  : index === currentStepIndex
                    ? 'current'
                    : 'upcoming'
              }
            >
              <i />
              {step.label}
            </span>
          ))}
        </div>

        <Outlet />
      </section>
    </main>
  );
}
