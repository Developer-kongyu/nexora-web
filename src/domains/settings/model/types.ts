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
  reposts: false,
  emailDigest: true,
  push: true,
};

export const RECOMMENDATION_INTEREST_OPTIONS = [
  '产品设计',
  '人工智能',
  '摄影',
  '软件开发',
  '旅行',
  '阅读与写作',
  '独立开发',
  '城市生活',
  '音乐',
  '健康',
] as const;
