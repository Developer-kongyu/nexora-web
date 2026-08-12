# 完整项目目录

以下目录树由当前阶段源码目录重新生成。`node_modules`、Git 元数据、构建产物、覆盖率和测试报告不进入源码压缩包。

```text
lct-web/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .storybook/
│   ├── main.ts
│   └── preview.ts
├── design-reference/
│   ├── png_preview/
│   │   ├── 01_app_shell.png
│   │   ├── 02_login.png
│   │   ├── 03_register_reset_google.png
│   │   ├── 04_01_onboarding_interests.png
│   │   ├── 04_02_onboarding_follow.png
│   │   ├── 04_03_onboarding_communities.png
│   │   ├── 05_home_feed.png
│   │   ├── 06_explore.png
│   │   ├── 07_search.png
│   │   ├── 08_compose.png
│   │   ├── 09_drafts.png
│   │   ├── 10_post_detail.png
│   │   ├── 11_media_viewer.png
│   │   ├── 12_profile.png
│   │   ├── 13_profile_edit.png
│   │   ├── 14_followers_following.png
│   │   ├── 16_bookmarks.png
│   │   ├── 17_content_center.png
│   │   ├── 18_communities_discover.png
│   │   ├── 19_community_detail.png
│   │   ├── 20_community_create.png
│   │   ├── 21_community_manage.png
│   │   ├── 22_notifications.png
│   │   ├── 23_settings_overview.png
│   │   ├── 24_settings_account.png
│   │   ├── 25_settings_privacy.png
│   │   ├── 26_settings_notifications.png
│   │   ├── 27_settings_preferences.png
│   │   ├── 28_settings_safety.png
│   │   ├── 29_system_states.png
│   │   └── 30_browsing_history.png
│   ├── #U9875#U9762#U8865#U5145#U8bf4#U660e.md
│   └── README_#U5bfc#U5165Figma.md
├── docs/
│   ├── adr/
│   │   └── 0001-domain-modular-spa.md
│   ├── ARCHITECTURE.md
│   ├── BACKEND_MAPPING.md
│   ├── CHANGELOG.md
│   ├── CODE_EXAMPLES.md
│   ├── DEVELOPMENT_GUIDE.md
│   ├── IMPLEMENTATION.md
│   ├── INPUT_REFERENCES.md
│   ├── KNOWN_ISSUES.md
│   ├── LCT_Vite_React_#U524d#U7aef#U5de5#U7a0b#U67b6#U6784#U6784#U5efa#U65b9#U6848.md
│   ├── PROJECT_TREE.md
│   ├── REUSE_GUIDELINES.md
│   ├── ROUTE_MAP.md
│   ├── STARTUP_CHECKLIST.md
│   └── VALIDATION_REPORT.md
├── public/
│   ├── media/
│   │   ├── city.svg
│   │   ├── coast.svg
│   │   ├── video-poster.svg
│   │   └── workflow.svg
│   ├── favicon.svg
│   ├── mock-qiniu-sdk.js
│   ├── mockServiceWorker.js
│   └── robots.txt
├── scripts/
│   ├── check-env.mjs
│   ├── check-reuse.mjs
│   └── generate-api.mjs
├── src/
│   ├── app/
│   │   ├── error/
│   │   │   ├── RootErrorBoundary.module.css
│   │   │   └── RootErrorBoundary.tsx
│   │   ├── layouts/
│   │   │   ├── AppShellLayout.module.css
│   │   │   ├── AppShellLayout.tsx
│   │   │   ├── OnboardingLayout.module.css
│   │   │   ├── OnboardingLayout.tsx
│   │   │   ├── PublicLayout.module.css
│   │   │   └── PublicLayout.tsx
│   │   ├── providers/
│   │   │   ├── AppProviders.tsx
│   │   │   ├── AuthBootstrap.tsx
│   │   │   └── RealtimeProvider.tsx
│   │   ├── router/
│   │   │   ├── guards.module.css
│   │   │   ├── guards.tsx
│   │   │   └── router.tsx
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   ├── reset.css
│   │   │   ├── tokens.css
│   │   │   └── typography.css
│   │   └── main.tsx
│   ├── domains/
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   └── authApi.ts
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── model/
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── validation.ts
│   │   │   └── index.ts
│   │   ├── communities/
│   │   │   ├── api/
│   │   │   │   ├── communitiesApi.test.ts
│   │   │   │   └── communitiesApi.ts
│   │   │   ├── lib/
│   │   │   │   └── presentation.ts
│   │   │   ├── model/
│   │   │   │   ├── index.ts
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   ├── engagement/
│   │   │   ├── api/
│   │   │   │   └── engagementApi.ts
│   │   │   └── index.ts
│   │   ├── feed/
│   │   │   ├── api/
│   │   │   │   ├── feedApi.test.ts
│   │   │   │   └── feedApi.ts
│   │   │   ├── hooks/
│   │   │   │   └── useFeed.ts
│   │   │   ├── model/
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   ├── library/
│   │   │   ├── api/
│   │   │   │   ├── libraryApi.test.ts
│   │   │   │   └── libraryApi.ts
│   │   │   ├── model/
│   │   │   │   ├── draftBatch.test.ts
│   │   │   │   ├── draftBatch.ts
│   │   │   │   ├── presentation.test.ts
│   │   │   │   ├── presentation.ts
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   ├── media/
│   │   │   ├── api/
│   │   │   │   ├── mediaApi.test.ts
│   │   │   │   └── mediaApi.ts
│   │   │   ├── hooks/
│   │   │   │   └── useMediaImageSelection.ts
│   │   │   ├── lib/
│   │   │   │   ├── imageSelection.test.ts
│   │   │   │   ├── imageSelection.ts
│   │   │   │   ├── mediaUploadError.ts
│   │   │   │   ├── postMedia.test.ts
│   │   │   │   ├── postMedia.ts
│   │   │   │   ├── postMediaUpload.ts
│   │   │   │   ├── qiniuBrowserUpload.test.ts
│   │   │   │   ├── qiniuBrowserUpload.ts
│   │   │   │   ├── uploadMediaImageSelection.ts
│   │   │   │   ├── uploadReadyMediaFile.test.ts
│   │   │   │   └── uploadReadyMediaFile.ts
│   │   │   ├── model/
│   │   │   │   ├── constraints.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── uploadQueueStore.ts
│   │   │   ├── ui/
│   │   │   │   └── MediaImageFileInput.tsx
│   │   │   └── index.ts
│   │   ├── notifications/
│   │   │   ├── api/
│   │   │   │   └── notificationsApi.ts
│   │   │   ├── hooks/
│   │   │   │   └── useNotifications.ts
│   │   │   ├── model/
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   ├── realtime/
│   │   │   │   └── realtimeClient.ts
│   │   │   └── index.ts
│   │   ├── permissions/
│   │   │   ├── api/
│   │   │   │   └── permissionsApi.ts
│   │   │   ├── model/
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   ├── posts/
│   │   │   ├── api/
│   │   │   │   ├── postsApi.drafts.test.ts
│   │   │   │   ├── postsApi.repost.test.ts
│   │   │   │   ├── postsApi.test.ts
│   │   │   │   └── postsApi.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useDraftListSelection.ts
│   │   │   │   └── usePost.ts
│   │   │   ├── lib/
│   │   │   │   ├── compose.test.ts
│   │   │   │   ├── compose.ts
│   │   │   │   ├── draftPresentation.ts
│   │   │   │   ├── postCardAdapter.test.ts
│   │   │   │   └── postCardAdapter.ts
│   │   │   ├── model/
│   │   │   │   ├── index.ts
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   ├── search/
│   │   │   ├── api/
│   │   │   │   └── searchApi.ts
│   │   │   ├── hooks/
│   │   │   │   └── useSearch.ts
│   │   │   ├── model/
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   ├── settings/
│   │   │   ├── api/
│   │   │   │   └── settingsApi.ts
│   │   │   ├── model/
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   └── users/
│   │       ├── api/
│   │       │   ├── usersApi.test.ts
│   │       │   └── usersApi.ts
│   │       ├── model/
│   │       │   ├── index.ts
│   │       │   ├── presentation.test.ts
│   │       │   ├── presentation.ts
│   │       │   ├── queryKeys.ts
│   │       │   ├── relationActions.ts
│   │       │   └── types.ts
│   │       └── index.ts
│   ├── mocks/
│   │   ├── browser.ts
│   │   ├── fixtures.ts
│   │   ├── handlers.compose.test.ts
│   │   ├── handlers.ts
│   │   └── server.ts
│   ├── pages/
│   │   ├── _shared/
│   │   │   ├── PageParts.tsx
│   │   │   ├── ProductPages.module.css
│   │   │   ├── SettingsPage.module.css
│   │   │   ├── SettingsPage.tsx
│   │   │   └── useMediaImagePairSelection.ts
│   │   ├── auth/
│   │   │   ├── AuthFormShell.tsx
│   │   │   ├── AuthPages.module.css
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── GoogleCompletePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   └── useVerificationCountdown.ts
│   │   ├── bookmarks/
│   │   │   ├── BookmarksPage.module.css
│   │   │   └── BookmarksPage.tsx
│   │   ├── communities-discover/
│   │   │   ├── CommunitiesDiscoverPage.module.css
│   │   │   └── CommunitiesDiscoverPage.tsx
│   │   ├── community-create/
│   │   │   ├── communityCreate.model.ts
│   │   │   ├── CommunityCreatePage.module.css
│   │   │   ├── CommunityCreatePage.tsx
│   │   │   └── CommunityImageField.tsx
│   │   ├── community-detail/
│   │   │   ├── CommunityDetailPage.module.css
│   │   │   └── CommunityDetailPage.tsx
│   │   ├── community-manage/
│   │   │   ├── sections/
│   │   │   │   ├── JoinRequestsSection.tsx
│   │   │   │   ├── LogsSection.tsx
│   │   │   │   ├── MembersSection.tsx
│   │   │   │   ├── OverviewSection.tsx
│   │   │   │   ├── PinnedPostsSection.tsx
│   │   │   │   ├── RulesSection.tsx
│   │   │   │   └── SettingsSection.tsx
│   │   │   ├── communityManage.model.ts
│   │   │   ├── CommunityManagePage.module.css
│   │   │   ├── CommunityManagePage.tsx
│   │   │   └── CommunityManageSidebar.tsx
│   │   ├── compose/
│   │   │   └── ComposePage.tsx
│   │   ├── content-center/
│   │   │   ├── ContentCenterPage.module.css
│   │   │   └── ContentCenterPage.tsx
│   │   ├── drafts/
│   │   │   ├── DraftsPage.module.css
│   │   │   └── DraftsPage.tsx
│   │   ├── explore/
│   │   │   └── ExplorePage.tsx
│   │   ├── follows/
│   │   │   ├── followList.model.test.ts
│   │   │   ├── followList.model.ts
│   │   │   ├── FollowListPage.module.css
│   │   │   └── FollowListPage.tsx
│   │   ├── history/
│   │   │   ├── BrowsingHistoryPage.module.css
│   │   │   └── BrowsingHistoryPage.tsx
│   │   ├── home/
│   │   │   └── HomePage.tsx
│   │   ├── media-viewer/
│   │   │   └── MediaViewerPage.tsx
│   │   ├── not-found/
│   │   │   ├── NotFoundPage.module.css
│   │   │   └── NotFoundPage.tsx
│   │   ├── notifications/
│   │   │   ├── NotificationsPage.module.css
│   │   │   └── NotificationsPage.tsx
│   │   ├── onboarding/
│   │   │   ├── CommunitiesPage.tsx
│   │   │   ├── FollowPage.tsx
│   │   │   ├── InterestsPage.tsx
│   │   │   ├── OnboardingSelection.module.css
│   │   │   └── OnboardingSelection.tsx
│   │   ├── post-detail/
│   │   │   ├── PostDetailPage.module.css
│   │   │   └── PostDetailPage.tsx
│   │   ├── profile/
│   │   │   ├── ProfilePage.module.css
│   │   │   └── ProfilePage.tsx
│   │   ├── profile-edit/
│   │   │   ├── profileEdit.model.test.ts
│   │   │   ├── profileEdit.model.ts
│   │   │   ├── ProfileEditPage.module.css
│   │   │   ├── ProfileEditPage.tsx
│   │   │   └── ProfileImageField.tsx
│   │   ├── search/
│   │   │   └── SearchPage.tsx
│   │   ├── settings/
│   │   │   ├── AccountSettingsPage.tsx
│   │   │   ├── NotificationSettingsPage.tsx
│   │   │   ├── PreferencesSettingsPage.tsx
│   │   │   ├── PrivacySettingsPage.tsx
│   │   │   ├── safetySettings.model.test.ts
│   │   │   ├── safetySettings.model.ts
│   │   │   ├── SafetySettingsPage.tsx
│   │   │   ├── SettingsOverviewPage.tsx
│   │   │   └── SettingsPages.module.css
│   │   └── system-states/
│   │       ├── SystemStatesDevPage.module.css
│   │       └── SystemStatesDevPage.tsx
│   ├── shared/
│   │   ├── api/
│   │   │   ├── generated/
│   │   │   │   └── openapi.d.ts
│   │   │   ├── authSession.test.ts
│   │   │   ├── authSession.ts
│   │   │   ├── client.test.ts
│   │   │   ├── client.ts
│   │   │   ├── errors.ts
│   │   │   ├── idempotency.test.ts
│   │   │   ├── idempotency.ts
│   │   │   ├── infiniteData.test.ts
│   │   │   ├── infiniteData.ts
│   │   │   ├── pagination.test.ts
│   │   │   ├── pagination.ts
│   │   │   ├── query.ts
│   │   │   └── queryClient.ts
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── paths.test.ts
│   │   │   └── paths.ts
│   │   ├── hooks/
│   │   │   ├── useCopyTextFeedback.ts
│   │   │   ├── useKeySelection.ts
│   │   │   ├── useOptimisticBooleanMutation.ts
│   │   │   └── useSynchronizedState.ts
│   │   ├── lib/
│   │   │   ├── array.test.ts
│   │   │   ├── array.ts
│   │   │   ├── clipboard.test.ts
│   │   │   ├── clipboard.ts
│   │   │   ├── cn.ts
│   │   │   ├── date.test.ts
│   │   │   ├── date.ts
│   │   │   ├── format.ts
│   │   │   ├── set.test.ts
│   │   │   ├── set.ts
│   │   │   ├── settleBatch.test.ts
│   │   │   ├── settleBatch.ts
│   │   │   ├── text.test.ts
│   │   │   ├── text.ts
│   │   │   ├── url.test.ts
│   │   │   └── url.ts
│   │   ├── model/
│   │   │   ├── media.ts
│   │   │   ├── options.ts
│   │   │   ├── presentation.ts
│   │   │   ├── types.ts
│   │   │   ├── userIdentity.ts
│   │   │   └── visibility.ts
│   │   └── ui/
│   │       ├── Avatar/
│   │       │   ├── Avatar.module.css
│   │       │   └── Avatar.tsx
│   │       ├── Badge/
│   │       │   ├── Badge.module.css
│   │       │   └── Badge.tsx
│   │       ├── Button/
│   │       │   ├── Button.module.css
│   │       │   └── Button.tsx
│   │       ├── Card/
│   │       │   ├── Card.module.css
│   │       │   └── Card.tsx
│   │       ├── EmptyState/
│   │       │   ├── EmptyState.module.css
│   │       │   └── EmptyState.tsx
│   │       ├── IconButton/
│   │       │   ├── IconButton.module.css
│   │       │   └── IconButton.tsx
│   │       ├── Modal/
│   │       │   ├── Modal.module.css
│   │       │   └── Modal.tsx
│   │       ├── PageHeader/
│   │       │   ├── PageHeader.module.css
│   │       │   └── PageHeader.tsx
│   │       ├── Select/
│   │       │   ├── Select.module.css
│   │       │   ├── Select.tsx
│   │       │   └── SelectOptions.tsx
│   │       ├── Spinner/
│   │       │   ├── Spinner.module.css
│   │       │   └── Spinner.tsx
│   │       ├── Switch/
│   │       │   ├── Switch.module.css
│   │       │   └── Switch.tsx
│   │       ├── TextField/
│   │       │   ├── TextField.module.css
│   │       │   └── TextField.tsx
│   │       ├── Toast/
│   │       │   ├── ToastContext.ts
│   │       │   ├── ToastProvider.module.css
│   │       │   ├── ToastProvider.tsx
│   │       │   └── useToast.ts
│   │       ├── index.ts
│   │       └── types.ts
│   ├── test/
│   │   ├── http.ts
│   │   └── setup.ts
│   ├── widgets/
│   │   ├── app-shell/
│   │   │   ├── Sidebar.module.css
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.module.css
│   │   │   └── Topbar.tsx
│   │   ├── community-card/
│   │   │   ├── CommunityCard.module.css
│   │   │   └── CommunityCard.tsx
│   │   ├── compose-editor/
│   │   │   ├── composeEditor.model.test.ts
│   │   │   ├── composeEditor.model.ts
│   │   │   ├── ComposeEditor.module.css
│   │   │   └── ComposeEditor.tsx
│   │   ├── layout/
│   │   │   ├── PageLayout.module.css
│   │   │   └── PageLayout.tsx
│   │   ├── media-viewer/
│   │   │   ├── MediaViewer.module.css
│   │   │   ├── MediaViewer.test.tsx
│   │   │   └── MediaViewer.tsx
│   │   ├── post-card/
│   │   │   ├── PostActionBar.tsx
│   │   │   ├── PostCard.module.css
│   │   │   ├── PostCard.stories.tsx
│   │   │   ├── PostCard.test.tsx
│   │   │   ├── PostCard.tsx
│   │   │   └── PostTagLinks.tsx
│   │   └── user-card/
│   │       ├── RelationUserCard.tsx
│   │       ├── UserCard.module.css
│   │       └── UserCard.tsx
│   └── vite-env.d.ts
├── tests/
│   └── e2e/
│       └── smoke.spec.ts
├── .dockerignore
├── .editorconfig
├── .env.development
├── .env.example
├── .env.production.example
├── .env.test
├── .gitignore
├── .nvmrc
├── .prettierignore
├── .prettierrc.json
├── CONTRIBUTING.md
├── docker-compose.yml
├── Dockerfile
├── eslint.config.js
├── index.html
├── nginx.conf
├── package-lock.json
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── README.md
├── SECURITY.md
├── stylelint.config.mjs
├── tsconfig.app.json
├── tsconfig.base.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```
