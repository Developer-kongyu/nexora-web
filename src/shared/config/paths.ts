function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

const SEARCH_PATH = '/search';
const COMPOSE_PATH = '/compose';
const BOOKMARKS_PATH = '/bookmarks';
const PASSWORD_RESET_PATH = '/auth/password/reset';

const profilePath = (handle: string) => `/users/${encodePathSegment(handle)}`;
const postPath = (postId: string) => `/posts/${encodePathSegment(postId)}`;
const communityPath = (slug: string) => `/communities/${encodePathSegment(slug)}`;
const communityManagePath = (communityId: string) =>
  `${communityPath(communityId)}/manage`;

export const paths = {
  login: '/auth/login',
  home: '/home',
  explore: '/explore',
  search: SEARCH_PATH,
  compose: COMPOSE_PATH,
  composeDraft: (draftId: string) => `${COMPOSE_PATH}/${encodePathSegment(draftId)}`,
  content: '/content',
  drafts: '/content/drafts',
  bookmarks: BOOKMARKS_PATH,
  bookmarkCollection: (collectionId: string) =>
    `${BOOKMARKS_PATH}/${encodePathSegment(collectionId)}`,
  communities: '/communities',
  notifications: '/notifications',
  settings: '/settings',
  settingsProfile: '/settings/profile',
  settingsAccount: '/settings/account',
  settingsPrivacy: '/settings/privacy',
  settingsNotifications: '/settings/notifications',
  settingsPreferences: '/settings/preferences',
  settingsSafety: '/settings/safety',
  history: '/history',
  passwordReset: PASSWORD_RESET_PATH,
  passwordResetFor: (identifier: string) =>
    `${PASSWORD_RESET_PATH}?identifier=${encodeURIComponent(identifier)}`,
  post: postPath,
  postMedia: (postId: string, mediaIndex: number) =>
    `${postPath(postId)}/media/${mediaIndex}`,
  profile: profilePath,
  profileFollowers: (handle: string) => `${profilePath(handle)}/followers`,
  profileFollowing: (handle: string) => `${profilePath(handle)}/following`,
  community: communityPath,
  communityAbout: (slug: string) => `${communityPath(slug)}?tab=about`,
  communityManage: communityManagePath,
  communityManageSection: (communityId: string, section: string) =>
    `${communityManagePath(communityId)}/${encodePathSegment(section)}`,
  composeForCommunity: (communityId: string) =>
    `${COMPOSE_PATH}?community=${encodeURIComponent(communityId)}`,
  searchResults: (query: string) => `${SEARCH_PATH}?q=${encodeURIComponent(query)}`,
} as const;
