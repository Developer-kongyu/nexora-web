import { fixtureState } from './fixtures.state';

function createSettingsState() {
  let mockNotificationSettings = {
    userId: fixtureState.currentUser.id,
    rowExists: true,
    source: 'PERSISTED' as const,
    inAppChannelEnabled: true,
    emailChannelEnabled: true,
    smsChannelEnabled: false,
    followNotificationEnabled: true,
    mentionNotificationEnabled: true,
    interactionNotificationEnabled: true,
    communityNotificationEnabled: true,
    systemNotificationEnabled: true,
    onlyMutualFollowCanNotify: false,
    quietHoursEnabled: false,
    quietHoursStartMinute: null as number | null,
    quietHoursEndMinute: null as number | null,
    quietHoursTimezone: null as string | null,
    defaultCommunityNewPostMode: 'HIGHLIGHTS' as const,
    defaultCommunityAnnouncementMode: 'REALTIME' as const,
    defaultCommunityInteractionMode: 'RELATED_ONLY' as const,
    notificationPreferenceVersion: 1,
  };

  let mockInterestTagCodes = ['design', 'machine-learning', 'photography'];

  const mockInterestTagLabels = [
    ['machine-learning', '人工智能'],
    ['design', '产品设计'],
    ['photography', '摄影'],
    ['web-development', '软件开发'],
    ['travel', '旅行'],
    ['writing', '阅读与写作'],
    ['music', '音乐'],
    ['sports', '健康生活'],
    ['databases', '数据库'],
    ['science', '科学'],
  ] as const;

  const mockInterestTagCatalog = mockInterestTagLabels.map(
    ([interestTagCode, displayName], sortOrder) => ({
      interestTagCode,
      displayName,
      sortOrder,
      enabled: true,
    }),
  );

  let mockRecommendationSettings = {
    userId: fixtureState.currentUser.id,
    localeCode: 'zh-CN' as string | null,
    regionCode: 'CN' as string | null,
    allowPersonalizedRecommendation: true,
    allowCrossLanguageRecommendation: true,
    allowCommunityRecommendation: true,
    interestTagCodes: [...mockInterestTagCodes],
    recommendationPreferenceVersion: 1,
  };

  let mockSearchSettings = {
    userId: fixtureState.currentUser.id,
    localeCode: mockRecommendationSettings.localeCode,
    regionCode: mockRecommendationSettings.regionCode,
    searchHistoryEnabled: true,
    searchAnalyticsEnabled: true,
    allowSearchTermsForTrending: true,
    searchPreferenceVersion: 1,
  };
  return {
    get mockNotificationSettings() {
      return mockNotificationSettings;
    },
    set mockNotificationSettings(value: typeof mockNotificationSettings) {
      mockNotificationSettings = value;
    },
    get mockInterestTagCodes() {
      return mockInterestTagCodes;
    },
    set mockInterestTagCodes(value: typeof mockInterestTagCodes) {
      mockInterestTagCodes = value;
    },
    mockInterestTagLabels,
    mockInterestTagCatalog,
    get mockRecommendationSettings() {
      return mockRecommendationSettings;
    },
    set mockRecommendationSettings(value: typeof mockRecommendationSettings) {
      mockRecommendationSettings = value;
    },
    get mockSearchSettings() {
      return mockSearchSettings;
    },
    set mockSearchSettings(value: typeof mockSearchSettings) {
      mockSearchSettings = value;
    },
  };
}

export let settingsState = createSettingsState();

export function resetSettingsState(): void {
  settingsState = createSettingsState();
}
