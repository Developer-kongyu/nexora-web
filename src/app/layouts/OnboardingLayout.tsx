import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { onboardingApi, useAuthStore } from '@/domains/auth';
import { APP_BRAND } from '@/shared/config/brand';
import { BrandMark, useToast } from '@/shared/ui';
import styles from './OnboardingLayout.module.css';

const ONBOARDING_STEPS = [
  { path: '/onboarding/interests', label: '选择兴趣' },
  { path: '/onboarding/follow', label: '推荐关注' },
  { path: '/onboarding/communities', label: '加入社群' },
] as const;

export function OnboardingLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [skipping, setSkipping] = useState(false);
  const { showToast } = useToast();
  const currentStepIndex = Math.max(
    0,
    ONBOARDING_STEPS.findIndex((step) => location.pathname === step.path),
  );
  const currentStepNumber = currentStepIndex + 1;

  const skipOnboarding = async () => {
    if (skipping) return;
    setSkipping(true);
    try {
      const result = await onboardingApi.skip();
      useAuthStore.setState({
        onboardingCompleted: true,
        onboardingStatus: result.onboardingStatus,
      });
      void navigate('/home', { replace: true });
    } catch {
      showToast({ tone: 'error', title: '暂时无法退出引导，请稍后重试' });
    } finally {
      setSkipping(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header>
          <Link className={styles.brand} to="/home">
            <BrandMark className={styles.logo} />
            <div>
              <strong>{APP_BRAND.name}</strong>
              <small>个性化欢迎引导</small>
            </div>
          </Link>
          <div className={styles.stepLabel}>
            <strong>完善你的内容体验</strong>
            <span>
              第 {currentStepNumber} / {ONBOARDING_STEPS.length} 步
            </span>
          </div>
          <button
            type="button"
            className={styles.exit}
            disabled={skipping}
            onClick={() => void skipOnboarding()}
          >
            <ArrowLeft size={16} />
            {skipping ? '正在退出…' : '稍后完成'}
          </button>
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
