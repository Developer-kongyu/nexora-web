# 页面与路由映射

| UI 页面        | 路由                                         | React 页面                 | 主要领域    |
| -------------- | -------------------------------------------- | -------------------------- | ----------- |
| 02 登录        | `/auth/login`                                | `LoginPage`                | B01 auth    |
| 03 注册        | `/auth/register`                             | `RegisterPage`             | B01 auth    |
| 03 忘记密码    | `/auth/password/forgot`                      | `ForgotPasswordPage`       | B01 auth    |
| 03 重置密码    | `/auth/password/reset`                       | `ResetPasswordPage`        | B01 auth    |
| 03 Google 补全 | `/auth/google/complete`                      | `GoogleCompletePage`       | B01 auth    |
| 04-1 兴趣标签  | `/onboarding/interests`                      | `InterestsPage`            | B01/B12     |
| 04-2 推荐关注  | `/onboarding/follow`                         | `FollowPage`               | B02/B09     |
| 04-3 推荐社群  | `/onboarding/communities`                    | `CommunitiesPage`          | B08/B09     |
| 05 首页        | `/home`                                      | `HomePage`                 | B09/B04/B06 |
| 06 发现        | `/explore`                                   | `ExplorePage`              | B09         |
| 07 搜索        | `/search?q=`                                 | `SearchPage`               | B10         |
| 08 发布帖子    | `/compose/:draftId?`                         | `ComposePage`              | B04/B05/B03 |
| 09 草稿箱      | `/content/drafts`                            | `DraftsPage`               | B04         |
| 10 帖子详情    | `/posts/:postId`                             | `PostDetailPage`           | B04/B06     |
| 11 媒体查看器  | `/posts/:postId/media/:mediaIndex`           | `MediaViewerPage`          | B04/B05     |
| 12 个人主页    | `/users/:handle`                             | `ProfilePage`              | B01/B02/B04 |
| 13 编辑资料    | `/settings/profile`                          | `ProfileEditPage`          | B02/B05     |
| 14 粉丝        | `/users/:handle/followers`                   | `FollowListPage`           | B02         |
| 14 关注        | `/users/:handle/following`                   | `FollowListPage`           | B02         |
| 15             | 已删除                                       | 不创建页面                 | —           |
| 16 收藏夹      | `/bookmarks/:collectionId?`                  | `BookmarksPage`            | B07         |
| 17 内容中心    | `/content`                                   | `ContentCenterPage`        | B07/B04     |
| 18 社群发现    | `/communities`                               | `CommunitiesDiscoverPage`  | B08/B09     |
| 19 社群详情    | `/communities/:slug`                         | `CommunityDetailPage`      | B08/B04     |
| 20 创建社群    | `/communities/new`                           | `CommunityCreatePage`      | B08/B05     |
| 21 社群管理    | `/communities/:communityId/manage/:section?` | `CommunityManagePage`      | B08         |
| 22 通知中心    | `/notifications`                             | `NotificationsPage`        | B11         |
| 23 设置总览    | `/settings`                                  | `SettingsOverviewPage`     | B12 聚合    |
| 24 账号设置    | `/settings/account`                          | `AccountSettingsPage`      | B01         |
| 25 隐私设置    | `/settings/privacy`                          | `PrivacySettingsPage`      | B03         |
| 26 通知设置    | `/settings/notifications`                    | `NotificationSettingsPage` | B11/B12     |
| 27 偏好设置    | `/settings/preferences`                      | `PreferencesSettingsPage`  | B12         |
| 28 安全设置    | `/settings/safety`                           | `SafetySettingsPage`       | B01/B02     |
| 29 系统状态    | `/__dev/states`                              | `SystemStatesDevPage`      | 开发工具    |
| 30 浏览历史    | `/history`                                   | `BrowsingHistoryPage`      | B07         |

所有业务路由由 `RequireAuth` 保护。onboarding 可根据后端 `onboardingCompleted` 再补充重定向策略。
