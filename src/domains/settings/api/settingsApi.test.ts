import { describe, expect, it } from 'vitest';
import { permissionsApi } from '@/domains/permissions';
import { settingsApi } from '@/domains/settings';

describe('settings and permissions default MSW contract', () => {
  it('returns and updates canonical interest and notification DTOs', async () => {
    const catalog = await settingsApi.interestCatalog();
    expect(catalog.dictionaryVersion).toBe('mock-interest-catalog-v1');
    expect(catalog.items[0]).toMatchObject({
      interestTagCode: 'machine-learning',
      displayName: '人工智能',
      enabled: true,
    });
    expect(catalog.allowedInterestTagCodes).toContain('machine-learning');

    const interests = await settingsApi.interests();
    expect(interests).toContain('machine-learning');

    await expect(settingsApi.updateInterests(['science', 'databases', 'design'])).resolves.toEqual([
      'science',
      'databases',
      'design',
    ]);

    const notification = await settingsApi.notification();
    const saved = await settingsApi.updateNotification({
      ...notification,
      interactionNotificationEnabled: false,
    });
    expect(saved.interactionNotificationEnabled).toBe(false);

    const recommendation = await settingsApi.recommendation();
    const savedRecommendation = await settingsApi.updateRecommendation({
      localeCode: recommendation.localeCode,
      regionCode: recommendation.regionCode,
      allowPersonalizedRecommendation: false,
      allowCrossLanguageRecommendation: recommendation.allowCrossLanguageRecommendation,
      allowCommunityRecommendation: recommendation.allowCommunityRecommendation,
    });
    expect(savedRecommendation.allowPersonalizedRecommendation).toBe(false);

    const search = await settingsApi.search();
    const savedSearch = await settingsApi.updateSearch({
      searchHistoryEnabled: false,
      searchAnalyticsEnabled: search.searchAnalyticsEnabled,
      allowSearchTermsForTrending: search.allowSearchTermsForTrending,
    });
    expect(savedSearch.searchHistoryEnabled).toBe(false);
  });

  it('wraps policy updates and previews in backend snapshots', async () => {
    const policy = await permissionsApi.get();
    const updated = await permissionsApi.update({
      ...policy,
      accountVisibility: 'PRIVATE',
      allowSearchIndex: false,
    });
    expect(updated).toMatchObject({
      accountVisibility: 'PRIVATE',
      allowSearchIndex: false,
    });

    const preview = await permissionsApi.preview(updated);
    expect(preview).toMatchObject({
      accountVisibility: 'PRIVATE',
      allowSearchIndex: false,
      defaultCommentPermission: 'EVERYONE',
    });
  });
});
