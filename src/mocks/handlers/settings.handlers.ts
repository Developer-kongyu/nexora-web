import { http } from 'msw';
import { ok } from './http';
import { fixtureState } from '../state/fixtures.state';
import { authState } from '../state/auth.state';
import { permissionsState } from '../state/permissions.state';
import { settingsState } from '../state/settings.state';

export const settingsHandlers = [
  http.get('/api/settings/overview', () =>
    ok({
      profile: {
        userId: fixtureState.currentUser.id,
        handle: authState.mockHandle,
        displayName: fixtureState.currentUser.displayName,
        avatarUrl: fixtureState.currentUser.avatarUrl,
        coverUrl: fixtureState.currentUser.coverUrl,
        bio: fixtureState.currentUser.bio,
        location: fixtureState.currentUser.location,
        websiteUrl: fixtureState.currentUser.website,
        updatedAt: '2026-08-09T01:00:00.000Z',
      },
      account: {
        status: 'ACTIVE' as const,
        activeSessionCount: authState.mockSessions.length,
      },
      privacy: {
        accountVisibility: permissionsState.mockPermissionPolicy.accountVisibility,
        allowSearchIndex: permissionsState.mockPermissionPolicy.allowSearchIndex,
        defaultPostVisibility: permissionsState.mockPermissionPolicy.defaultPostVisibility,
        defaultCommentPermission: permissionsState.mockPermissionPolicy.defaultCommentPermission,
        defaultQuotePermission: permissionsState.mockPermissionPolicy.defaultQuotePermission,
        mentionPermission: permissionsState.mockPermissionPolicy.mentionPermission,
      },
      notification: {
        userId: settingsState.mockNotificationSettings.userId,
        rowExists: settingsState.mockNotificationSettings.rowExists,
        source: settingsState.mockNotificationSettings.source,
        inAppChannelEnabled: settingsState.mockNotificationSettings.inAppChannelEnabled,
        emailChannelEnabled: settingsState.mockNotificationSettings.emailChannelEnabled,
        smsChannelEnabled: settingsState.mockNotificationSettings.smsChannelEnabled,
        communityNotificationEnabled:
          settingsState.mockNotificationSettings.communityNotificationEnabled,
        quietHoursEnabled: settingsState.mockNotificationSettings.quietHoursEnabled,
        notificationPreferenceVersion:
          settingsState.mockNotificationSettings.notificationPreferenceVersion,
      },
      search: settingsState.mockSearchSettings,
      recommendation: {
        userId: settingsState.mockRecommendationSettings.userId,
        localeCode: settingsState.mockRecommendationSettings.localeCode,
        regionCode: settingsState.mockRecommendationSettings.regionCode,
        allowPersonalizedRecommendation:
          settingsState.mockRecommendationSettings.allowPersonalizedRecommendation,
        allowCrossLanguageRecommendation:
          settingsState.mockRecommendationSettings.allowCrossLanguageRecommendation,
        allowCommunityRecommendation:
          settingsState.mockRecommendationSettings.allowCommunityRecommendation,
        interestTagCount: settingsState.mockRecommendationSettings.interestTagCodes.length,
        recommendationPreferenceVersion:
          settingsState.mockRecommendationSettings.recommendationPreferenceVersion,
      },
    }),
  ),
  http.get('/api/settings/notifications', () => ok(settingsState.mockNotificationSettings)),
  http.patch('/api/settings/notifications', async ({ request }) => {
    const patch = (await request.json()) as Partial<typeof settingsState.mockNotificationSettings>;
    settingsState.mockNotificationSettings = {
      ...settingsState.mockNotificationSettings,
      ...patch,
      userId: fixtureState.currentUser.id,
      rowExists: true,
      source: 'PERSISTED',
      notificationPreferenceVersion:
        settingsState.mockNotificationSettings.notificationPreferenceVersion + 1,
    };
    return ok(settingsState.mockNotificationSettings);
  }),
  http.get('/api/settings/recommendation', () => ok(settingsState.mockRecommendationSettings)),
  http.patch('/api/settings/recommendation', async ({ request }) => {
    const patch = (await request.json()) as Partial<
      typeof settingsState.mockRecommendationSettings
    >;
    settingsState.mockRecommendationSettings = {
      ...settingsState.mockRecommendationSettings,
      ...patch,
      userId: fixtureState.currentUser.id,
      interestTagCodes: settingsState.mockRecommendationSettings.interestTagCodes,
      recommendationPreferenceVersion:
        settingsState.mockRecommendationSettings.recommendationPreferenceVersion + 1,
    };
    settingsState.mockSearchSettings = {
      ...settingsState.mockSearchSettings,
      localeCode: settingsState.mockRecommendationSettings.localeCode,
      regionCode: settingsState.mockRecommendationSettings.regionCode,
    };
    return ok(settingsState.mockRecommendationSettings);
  }),
  http.get('/api/settings/search', () => ok(settingsState.mockSearchSettings)),
  http.patch('/api/settings/search', async ({ request }) => {
    const patch = (await request.json()) as Partial<typeof settingsState.mockSearchSettings>;
    settingsState.mockSearchSettings = {
      ...settingsState.mockSearchSettings,
      ...patch,
      userId: fixtureState.currentUser.id,
      localeCode: settingsState.mockRecommendationSettings.localeCode,
      regionCode: settingsState.mockRecommendationSettings.regionCode,
      searchPreferenceVersion: settingsState.mockSearchSettings.searchPreferenceVersion + 1,
    };
    return ok(settingsState.mockSearchSettings);
  }),
  http.get('/api/settings/interests/catalog', () =>
    ok({
      dictionaryVersion: 'mock-interest-catalog-v1',
      items: settingsState.mockInterestTagCatalog,
      allowedInterestTagCodes: settingsState.mockInterestTagCatalog.map(
        (item) => item.interestTagCode,
      ),
    }),
  ),
  http.get('/api/settings/interests', () =>
    ok({
      list: settingsState.mockInterestTagCodes.map((interestTagCode) => ({ interestTagCode })),
    }),
  ),
  http.put('/api/settings/interests', async ({ request }) => {
    const body = (await request.json()) as { items: Array<{ interestTagCode: string }> };
    settingsState.mockInterestTagCodes = body.items.map((item) => item.interestTagCode);
    settingsState.mockRecommendationSettings = {
      ...settingsState.mockRecommendationSettings,
      interestTagCodes: [...settingsState.mockInterestTagCodes],
      recommendationPreferenceVersion:
        settingsState.mockRecommendationSettings.recommendationPreferenceVersion + 1,
    };
    return ok({
      list: settingsState.mockInterestTagCodes.map((interestTagCode) => ({ interestTagCode })),
    });
  }),
];
