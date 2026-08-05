import { useQuery } from '@tanstack/react-query';
import { onboardingApi, useAuthStore } from '@/domains/auth';
import { settingsApi, settingsKeys } from '@/domains/settings';
import type { AccentTone } from '@/shared/model/presentation';
import { OnboardingSelection, type OnboardingOption } from './OnboardingSelection';

const INTEREST_TONES: AccentTone[] = ['purple', 'cyan', 'green', 'pink', 'orange'];

export function InterestsPage() {
  const catalogQuery = useQuery({
    queryKey: settingsKeys.interestCatalog,
    queryFn: settingsApi.interestCatalog,
    staleTime: 5 * 60 * 1000,
  });
  const options: OnboardingOption[] =
    catalogQuery.data?.items
      .filter((item) => item.enabled)
      .map((item, index) => ({
        id: item.interestTagCode,
        title: item.displayName,
        description: `探索${item.displayName}相关内容`,
        tone: INTEREST_TONES[index % INTEREST_TONES.length] ?? 'purple',
      })) ?? [];

  const submit = async (selected: string[]) => {
    await onboardingApi.saveInterests(selected);
    useAuthStore.setState({ onboardingStatus: 'PENDING_RECOMMENDED_USERS' });
  };

  return (
    <OnboardingSelection
      key={catalogQuery.data?.dictionaryVersion ?? 'interest-catalog-loading'}
      title="选择感兴趣的话题"
      description="兴趣标签由服务端字典提供，并用于生成推荐快照。"
      options={options}
      loading={catalogQuery.isLoading}
      error={catalogQuery.error?.message ?? null}
      nextPath="/onboarding/follow"
      minSelection={3}
      onSubmit={submit}
      onSkip={() => submit([])}
    />
  );
}
