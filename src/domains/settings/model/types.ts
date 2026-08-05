export interface NotificationSettingsView {
  comments: boolean;
  likes: boolean;
  follows: boolean;
  communities: boolean;
  mentions: boolean;
  reposts: boolean;
  emailDigest: boolean;
  push: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsView = {
  comments: true,
  likes: true,
  follows: true,
  communities: true,
  mentions: true,
  reposts: true,
  emailDigest: true,
  push: true,
};

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
