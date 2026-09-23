# 完整项目目录

以下目录树由当前阶段源码目录重新生成。`node_modules`、Git 元数据、构建产物、覆盖率和测试报告不进入源码压缩包。

```text
twitter-clone-web/
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
│   ├── tutorial/
│   │   ├── 01-web-and-project-overview.md
│   │   ├── 02-environment-and-first-run.md
│   │   ├── 03-typescript-and-react-basics.md
│   │   ├── 04-directory-architecture.md
│   │   ├── 05-bootstrap-routing-and-providers.md
│   │   ├── 06-components-css-and-design-system.md
│   │   ├── 07-api-state-and-authentication.md
│   │   ├── 08-forms-and-validation.md
│   │   ├── 09-feature-flow-walkthrough.md
│   │   ├── 10-mocks-and-testing.md
│   │   ├── 11-debugging-guide.md
│   │   ├── 12-build-deploy-and-ci.md
│   │   ├── 13-how-to-add-a-feature.md
│   │   ├── 14-glossary-and-faq.md
│   │   ├── 15-practice-labs.md
│   │   └── README.md
│   ├── ARCHITECTURE_MIGRATION.md
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
│   ├── VALIDATION_REPORT.md
│   ├── 代码系统学习方案.md
│   ├── 推荐项目目录与架构设计.md
│   ├── 推荐项目目录与架构设计.pdf
│   ├── 第二阶段独立学习指南.md
│   └── 项目目录结构与文件职责详解.md
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
│   ├── check-boundaries.mjs
│   ├── check-boundaries.test.mjs
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
│   │   │   ├── AuthBootstrap.test.tsx
│   │   │   ├── AuthBootstrap.tsx
│   │   │   ├── RealtimeProvider.test.tsx
│   │   │   └── RealtimeProvider.tsx
│   │   ├── router/
│   │   │   ├── guards.module.css
│   │   │   ├── guards.test.tsx
│   │   │   ├── guards.tsx
│   │   │   └── router.tsx
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   ├── reset.css
│   │   │   ├── tokens.css
│   │   │   └── typography.css
│   │   ├── ApplicationRoot.tsx
│   │   ├── bootstrapApplication.test.ts
│   │   ├── bootstrapApplication.ts
│   │   ├── bootstrapFailure.test.ts
│   │   ├── bootstrapFailure.ts
│   │   ├── main.ts
│   │   └── mountApplication.ts
│   ├── domains/
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   ├── authApi.test.ts
│   │   │   │   ├── authApi.ts
│   │   │   │   └── onboardingApi.ts
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── lib/
│   │   │   │   └── googleIdentity.ts
│   │   │   ├── model/
│   │   │   │   ├── authStore.test.ts
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── onboardingRoute.test.ts
│   │   │   │   ├── onboardingRoute.ts
│   │   │   │   ├── pendingPrimaryEmail.ts
│   │   │   │   ├── phone.test.ts
│   │   │   │   ├── phone.ts
│   │   │   │   ├── queryKeys.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── validation.ts
│   │   │   ├── ui/
│   │   │   │   ├── GoogleCredentialButton.module.css
│   │   │   │   └── GoogleCredentialButton.tsx
│   │   │   └── index.ts
│   │   ├── communities/
│   │   │   ├── api/
│   │   │   │   ├── communitiesApi.defaultMock.test.ts
│   │   │   │   ├── communitiesApi.test.ts
│   │   │   │   └── communitiesApi.ts
│   │   │   ├── lib/
│   │   │   │   ├── communityAdapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── presentation.ts
│   │   │   ├── model/
│   │   │   │   ├── index.ts
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   ├── engagement/
│   │   │   ├── api/
│   │   │   │   ├── engagementApi.test.ts
│   │   │   │   └── engagementApi.ts
│   │   │   ├── hooks/
│   │   │   │   └── usePostImpression.ts
│   │   │   └── index.ts
│   │   ├── feed/
│   │   │   ├── api/
│   │   │   │   ├── feedApi.test.ts
│   │   │   │   └── feedApi.ts
│   │   │   ├── hooks/
│   │   │   │   └── useFeed.ts
│   │   │   ├── lib/
│   │   │   │   ├── feedAdapter.ts
│   │   │   │   ├── feedRefresh.test.ts
│   │   │   │   └── feedRefresh.ts
│   │   │   ├── model/
│   │   │   │   ├── index.ts
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
│   │   │   │   ├── index.ts
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
│   │   │   │   ├── useMediaImagePairSelection.ts
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
│   │   │   │   ├── index.ts
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
│   │   │   │   ├── index.ts
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   ├── realtime/
│   │   │   │   └── realtimeClient.ts
│   │   │   └── index.ts
│   │   ├── permissions/
│   │   │   ├── api/
│   │   │   │   └── permissionsApi.ts
│   │   │   ├── model/
│   │   │   │   ├── index.ts
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   ├── posts/
│   │   │   ├── api/
│   │   │   │   ├── index.ts
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
│   │   │   │   ├── index.ts
│   │   │   │   ├── postCardAdapter.test.ts
│   │   │   │   ├── postCardAdapter.ts
│   │   │   │   ├── postText.test.ts
│   │   │   │   └── postText.ts
│   │   │   ├── model/
│   │   │   │   ├── index.ts
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   ├── search/
│   │   │   ├── api/
│   │   │   │   ├── searchApi.test.ts
│   │   │   │   └── searchApi.ts
│   │   │   ├── hooks/
│   │   │   │   └── useSearch.ts
│   │   │   ├── model/
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   ├── settings/
│   │   │   ├── api/
│   │   │   │   ├── settingsApi.test.ts
│   │   │   │   └── settingsApi.ts
│   │   │   ├── model/
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   └── users/
│   │       ├── api/
│   │       │   ├── index.ts
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
│   ├── features/
│   │   ├── compose-post/
│   │   │   ├── model/
│   │   │   │   ├── compose.schema.ts
│   │   │   │   ├── composeFlow.test.tsx
│   │   │   │   ├── composeForm.test.ts
│   │   │   │   ├── composeForm.ts
│   │   │   │   ├── draftError.ts
│   │   │   │   ├── types.ts
│   │   │   │   ├── useComposer.ts
│   │   │   │   ├── useComposeUploads.test.tsx
│   │   │   │   ├── useComposeUploads.ts
│   │   │   │   ├── useDraftAutosave.ts
│   │   │   │   └── usePublishPost.ts
│   │   │   ├── ui/
│   │   │   │   ├── ComposeEditor.module.css
│   │   │   │   ├── ComposeEditor.test.tsx
│   │   │   │   ├── ComposeEditor.tsx
│   │   │   │   └── MediaQueue.tsx
│   │   │   └── index.ts
│   │   └── post-interactions/
│   │       ├── model/
│   │       │   ├── interactionCache.ts
│   │       │   ├── usePostInteractions.test.tsx
│   │       │   └── usePostInteractions.ts
│   │       └── index.ts
│   ├── mocks/
│   │   ├── fixtures/
│   │   │   ├── communities.fixture.ts
│   │   │   ├── factory.ts
│   │   │   ├── notifications.fixture.ts
│   │   │   ├── posts.fixture.ts
│   │   │   └── users.fixture.ts
│   │   ├── handlers/
│   │   │   ├── auth.handlers.ts
│   │   │   ├── communities.handlers.ts
│   │   │   ├── engagement.handlers.ts
│   │   │   ├── feed.handlers.ts
│   │   │   ├── http.ts
│   │   │   ├── library.handlers.ts
│   │   │   ├── media.handlers.ts
│   │   │   ├── notifications.handlers.ts
│   │   │   ├── permissions.handlers.ts
│   │   │   ├── posts.handlers.ts
│   │   │   ├── posts.helpers.ts
│   │   │   ├── search.handlers.ts
│   │   │   ├── settings.handlers.ts
│   │   │   └── users.handlers.ts
│   │   ├── state/
│   │   │   ├── auth.state.ts
│   │   │   ├── communities.state.ts
│   │   │   ├── engagement.state.ts
│   │   │   ├── fixtures.state.ts
│   │   │   ├── index.ts
│   │   │   ├── library.state.ts
│   │   │   ├── media.state.ts
│   │   │   ├── notifications.state.ts
│   │   │   ├── permissions.state.ts
│   │   │   ├── posts.state.ts
│   │   │   ├── settings.state.ts
│   │   │   └── users.state.ts
│   │   ├── browser.ts
│   │   ├── fixtures.ts
│   │   ├── handlers.compose.test.ts
│   │   ├── handlers.interactions.test.ts
│   │   ├── handlers.isolation.test.ts
│   │   ├── handlers.ts
│   │   └── server.ts
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── AuthFormShell.tsx
│   │   │   ├── AuthPages.module.css
│   │   │   ├── EmailVerificationPage.tsx
│   │   │   ├── ForgotPasswordPage.test.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── GoogleCompletePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── loginValidation.test.ts
│   │   │   ├── loginValidation.ts
│   │   │   ├── passwordResetFlow.test.ts
│   │   │   ├── passwordResetFlow.ts
│   │   │   ├── RegisterPage.test.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   ├── useVerificationCountdown.test.tsx
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
│   │   │   ├── communityManage.model.test.ts
│   │   │   ├── communityManage.model.ts
│   │   │   ├── CommunityManagePage.module.css
│   │   │   ├── CommunityManagePage.tsx
│   │   │   └── CommunityManageSidebar.tsx
│   │   ├── compose/
│   │   │   └── ComposePage.tsx
│   │   ├── content-center/
│   │   │   ├── contentCenter.model.test.ts
│   │   │   ├── contentCenter.model.ts
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
│   │   │   ├── BrowsingHistoryPage.tsx
│   │   │   ├── historyDeleteFeedback.test.ts
│   │   │   └── historyDeleteFeedback.ts
│   │   ├── home/
│   │   │   ├── HomePage.module.css
│   │   │   └── HomePage.tsx
│   │   ├── media-viewer/
│   │   │   └── MediaViewerPage.tsx
│   │   ├── not-found/
│   │   │   ├── NotFoundPage.module.css
│   │   │   └── NotFoundPage.tsx
│   │   ├── notifications/
│   │   │   ├── NotificationsPage.module.css
│   │   │   ├── NotificationsPage.test.tsx
│   │   │   └── NotificationsPage.tsx
│   │   ├── onboarding/
│   │   │   ├── CommunitiesPage.tsx
│   │   │   ├── FollowPage.test.tsx
│   │   │   ├── FollowPage.tsx
│   │   │   ├── InterestsPage.tsx
│   │   │   ├── OnboardingSelection.module.css
│   │   │   └── OnboardingSelection.tsx
│   │   ├── post-detail/
│   │   │   ├── PostDetailPage.module.css
│   │   │   ├── PostDetailPage.test.tsx
│   │   │   └── PostDetailPage.tsx
│   │   ├── profile/
│   │   │   ├── ProfilePage.module.css
│   │   │   └── ProfilePage.tsx
│   │   ├── profile-edit/
│   │   │   ├── ui/
│   │   │   │   ├── SaveFooter.module.css
│   │   │   │   └── SaveFooter.tsx
│   │   │   ├── profileEdit.model.test.ts
│   │   │   ├── profileEdit.model.ts
│   │   │   ├── ProfileEditPage.module.css
│   │   │   ├── ProfileEditPage.test.tsx
│   │   │   ├── ProfileEditPage.tsx
│   │   │   └── ProfileImageField.tsx
│   │   ├── search/
│   │   │   └── SearchPage.tsx
│   │   ├── settings/
│   │   │   ├── ui/
│   │   │   │   ├── SettingsPage.module.css
│   │   │   │   └── SettingsPage.tsx
│   │   │   ├── AccountSettingsPage.test.tsx
│   │   │   ├── AccountSettingsPage.tsx
│   │   │   ├── EmailIdentityVerificationPage.test.tsx
│   │   │   ├── EmailIdentityVerificationPage.tsx
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
│   │   │   ├── brand.ts
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
│   │   │   ├── error.test.ts
│   │   │   ├── error.ts
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
│   │       ├── BrandMark/
│   │       │   ├── BrandMark.module.css
│   │       │   └── BrandMark.tsx
│   │       ├── Button/
│   │       │   ├── Button.module.css
│   │       │   └── Button.tsx
│   │       ├── Card/
│   │       │   ├── Card.module.css
│   │       │   └── Card.tsx
│   │       ├── EmptyPanel/
│   │       │   ├── EmptyPanel.module.css
│   │       │   └── EmptyPanel.tsx
│   │       ├── EmptyState/
│   │       │   ├── EmptyState.module.css
│   │       │   └── EmptyState.tsx
│   │       ├── IconButton/
│   │       │   ├── IconButton.module.css
│   │       │   └── IconButton.tsx
│   │       ├── layout/
│   │       │   ├── ContentLayout.module.css
│   │       │   ├── index.ts
│   │       │   ├── PageLayout.module.css
│   │       │   └── PageLayout.tsx
│   │       ├── LoadingRows/
│   │       │   ├── LoadingRows.module.css
│   │       │   └── LoadingRows.tsx
│   │       ├── Modal/
│   │       │   ├── Modal.module.css
│   │       │   ├── Modal.test.tsx
│   │       │   └── Modal.tsx
│   │       ├── Notice/
│   │       │   ├── Notice.module.css
│   │       │   └── Notice.tsx
│   │       ├── PageHeader/
│   │       │   ├── PageHeader.module.css
│   │       │   └── PageHeader.tsx
│   │       ├── Select/
│   │       │   ├── Select.module.css
│   │       │   ├── Select.tsx
│   │       │   └── SelectOptions.tsx
│   │       ├── SideCard/
│   │       │   ├── SideCard.module.css
│   │       │   └── SideCard.tsx
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
│   │       │   ├── ToastProvider.test.tsx
│   │       │   ├── ToastProvider.tsx
│   │       │   └── useToast.ts
│   │       ├── index.ts
│   │       └── types.ts
│   ├── test/
│   │   ├── http.ts
│   │   └── setup.ts
│   ├── widgets/
│   │   ├── app-shell/
│   │   │   ├── index.ts
│   │   │   ├── Sidebar.module.css
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.module.css
│   │   │   └── Topbar.tsx
│   │   ├── community-card/
│   │   │   ├── CommunityCard.module.css
│   │   │   ├── CommunityCard.tsx
│   │   │   └── index.ts
│   │   ├── media-viewer/
│   │   │   ├── index.ts
│   │   │   ├── MediaViewer.module.css
│   │   │   ├── MediaViewer.test.tsx
│   │   │   └── MediaViewer.tsx
│   │   ├── post-card/
│   │   │   ├── index.ts
│   │   │   ├── PostActionBar.tsx
│   │   │   ├── PostCard.module.css
│   │   │   ├── PostCard.stories.tsx
│   │   │   ├── PostCard.test.tsx
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostRichText.module.css
│   │   │   ├── PostRichText.tsx
│   │   │   └── PostTagLinks.tsx
│   │   ├── quick-compose/
│   │   │   ├── index.ts
│   │   │   ├── QuickCompose.module.css
│   │   │   └── QuickCompose.tsx
│   │   └── user-card/
│   │       ├── index.ts
│   │       ├── RelationUserCard.tsx
│   │       ├── UserCard.module.css
│   │       └── UserCard.tsx
│   └── vite-env.d.ts
├── tests/
│   └── e2e/
│       ├── architecture-migration.spec.ts
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
