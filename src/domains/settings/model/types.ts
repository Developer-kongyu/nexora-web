export interface NotificationSettingsView {
  userId: string;
  rowExists: boolean;
  source: 'PERSISTED' | 'SYNTHETIC_DEFAULT';
  inAppChannelEnabled: boolean;
  emailChannelEnabled: boolean;
  smsChannelEnabled: boolean;
  followNotificationEnabled: boolean;
  mentionNotificationEnabled: boolean;
  interactionNotificationEnabled: boolean;
  communityNotificationEnabled: boolean;
  systemNotificationEnabled: boolean;
  onlyMutualFollowCanNotify: boolean;
  quietHoursEnabled: boolean;
  quietHoursStartMinute: number | null;
  quietHoursEndMinute: number | null;
  quietHoursTimezone: string | null;
  defaultCommunityNewPostMode: 'ALL' | 'HIGHLIGHTS' | 'OFF';
  defaultCommunityAnnouncementMode: 'REALTIME' | 'OFF';
  defaultCommunityInteractionMode: 'RELATED_ONLY' | 'OFF';
  notificationPreferenceVersion: number | null;
}

export type NotificationSettingsPatch = Pick<
  NotificationSettingsView,
  | 'inAppChannelEnabled'
  | 'emailChannelEnabled'
  | 'smsChannelEnabled'
  | 'followNotificationEnabled'
  | 'mentionNotificationEnabled'
  | 'interactionNotificationEnabled'
  | 'communityNotificationEnabled'
  | 'systemNotificationEnabled'
  | 'onlyMutualFollowCanNotify'
  | 'quietHoursEnabled'
  | 'quietHoursStartMinute'
  | 'quietHoursEndMinute'
  | 'quietHoursTimezone'
  | 'defaultCommunityNewPostMode'
  | 'defaultCommunityAnnouncementMode'
  | 'defaultCommunityInteractionMode'
>;

export interface RecommendationPreferenceView {
  userId: string;
  localeCode: string | null;
  regionCode: string | null;
  allowPersonalizedRecommendation: boolean;
  allowCrossLanguageRecommendation: boolean;
  allowCommunityRecommendation: boolean;
  interestTagCodes: string[];
  recommendationPreferenceVersion: number;
}

export type RecommendationPreferencePatch = Pick<
  RecommendationPreferenceView,
  | 'localeCode'
  | 'regionCode'
  | 'allowPersonalizedRecommendation'
  | 'allowCrossLanguageRecommendation'
  | 'allowCommunityRecommendation'
>;

export interface SearchPreferenceView {
  userId: string;
  localeCode: string | null;
  regionCode: string | null;
  searchHistoryEnabled: boolean;
  searchAnalyticsEnabled: boolean;
  allowSearchTermsForTrending: boolean;
  searchPreferenceVersion: number;
}

export type SearchPreferencePatch = Pick<
  SearchPreferenceView,
  'searchHistoryEnabled' | 'searchAnalyticsEnabled' | 'allowSearchTermsForTrending'
>;

export interface InterestTagCatalogItem {
  interestTagCode: string;
  displayName: string;
  sortOrder: number;
  enabled: boolean;
}

export interface InterestTagCatalogView {
  dictionaryVersion: string;
  items: InterestTagCatalogItem[];
  allowedInterestTagCodes: string[];
}
