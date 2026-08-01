import { Navigate, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppShellLayout } from '@/app/layouts/AppShellLayout';
import { OnboardingLayout } from '@/app/layouts/OnboardingLayout';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { RootErrorBoundary } from '@/app/error/RootErrorBoundary';
import { RequireAuth } from './guards';

const loadFollowListPage = async () => ({
  Component: (await import('@/pages/follows/FollowListPage')).FollowListPage,
});

const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RootErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      {
        path: 'auth',
        element: <PublicLayout />,
        children: [
          {
            path: 'login',
            lazy: async () => ({ Component: (await import('@/pages/auth/LoginPage')).LoginPage }),
          },
          {
            path: 'register',
            lazy: async () => ({
              Component: (await import('@/pages/auth/RegisterPage')).RegisterPage,
            }),
          },
          {
            path: 'password/forgot',
            lazy: async () => ({
              Component: (await import('@/pages/auth/ForgotPasswordPage')).ForgotPasswordPage,
            }),
          },
          {
            path: 'password/reset',
            lazy: async () => ({
              Component: (await import('@/pages/auth/ResetPasswordPage')).ResetPasswordPage,
            }),
          },
          {
            path: 'google/complete',
            lazy: async () => ({
              Component: (await import('@/pages/auth/GoogleCompletePage')).GoogleCompletePage,
            }),
          },
        ],
      },
      {
        path: 'onboarding',
        element: (
          <RequireAuth>
            <OnboardingLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to="interests" replace /> },
          {
            path: 'interests',
            lazy: async () => ({
              Component: (await import('@/pages/onboarding/InterestsPage')).InterestsPage,
            }),
          },
          {
            path: 'follow',
            lazy: async () => ({
              Component: (await import('@/pages/onboarding/FollowPage')).FollowPage,
            }),
          },
          {
            path: 'communities',
            lazy: async () => ({
              Component: (await import('@/pages/onboarding/CommunitiesPage')).CommunitiesPage,
            }),
          },
        ],
      },
      {
        element: (
          <RequireAuth>
            <AppShellLayout />
          </RequireAuth>
        ),
        children: [
          {
            path: 'home',
            lazy: async () => ({ Component: (await import('@/pages/home/HomePage')).HomePage }),
          },
          {
            path: 'explore',
            lazy: async () => ({
              Component: (await import('@/pages/explore/ExplorePage')).ExplorePage,
            }),
          },
          {
            path: 'search',
            lazy: async () => ({
              Component: (await import('@/pages/search/SearchPage')).SearchPage,
            }),
          },
          {
            path: 'compose/:draftId?',
            lazy: async () => ({
              Component: (await import('@/pages/compose/ComposePage')).ComposePage,
            }),
          },
          {
            path: 'content/drafts',
            lazy: async () => ({
              Component: (await import('@/pages/drafts/DraftsPage')).DraftsPage,
            }),
          },
          {
            path: 'posts/:postId',
            lazy: async () => ({
              Component: (await import('@/pages/post-detail/PostDetailPage')).PostDetailPage,
            }),
          },
          {
            path: 'posts/:postId/media/:mediaIndex',
            lazy: async () => ({
              Component: (await import('@/pages/media-viewer/MediaViewerPage')).MediaViewerPage,
            }),
          },
          {
            path: 'users/:handle',
            lazy: async () => ({
              Component: (await import('@/pages/profile/ProfilePage')).ProfilePage,
            }),
          },
          {
            path: 'users/:handle/followers',
            lazy: loadFollowListPage,
          },
          {
            path: 'users/:handle/following',
            lazy: loadFollowListPage,
          },
          {
            path: 'bookmarks/:collectionId?',
            lazy: async () => ({
              Component: (await import('@/pages/bookmarks/BookmarksPage')).BookmarksPage,
            }),
          },
          {
            path: 'content',
            lazy: async () => ({
              Component: (await import('@/pages/content-center/ContentCenterPage'))
                .ContentCenterPage,
            }),
          },
          {
            path: 'communities',
            lazy: async () => ({
              Component: (await import('@/pages/communities-discover/CommunitiesDiscoverPage'))
                .CommunitiesDiscoverPage,
            }),
          },
          {
            path: 'communities/new',
            lazy: async () => ({
              Component: (await import('@/pages/community-create/CommunityCreatePage'))
                .CommunityCreatePage,
            }),
          },
          {
            path: 'communities/:communityId/manage/:section?',
            lazy: async () => ({
              Component: (await import('@/pages/community-manage/CommunityManagePage'))
                .CommunityManagePage,
            }),
          },
          {
            path: 'communities/:slug',
            lazy: async () => ({
              Component: (await import('@/pages/community-detail/CommunityDetailPage'))
                .CommunityDetailPage,
            }),
          },
          {
            path: 'notifications',
            lazy: async () => ({
              Component: (await import('@/pages/notifications/NotificationsPage'))
                .NotificationsPage,
            }),
          },
          {
            path: 'settings',
            lazy: async () => ({
              Component: (await import('@/pages/settings/SettingsOverviewPage'))
                .SettingsOverviewPage,
            }),
          },
          {
            path: 'settings/profile',
            lazy: async () => ({
              Component: (await import('@/pages/profile-edit/ProfileEditPage')).ProfileEditPage,
            }),
          },
          {
            path: 'settings/account',
            lazy: async () => ({
              Component: (await import('@/pages/settings/AccountSettingsPage')).AccountSettingsPage,
            }),
          },
          {
            path: 'settings/privacy',
            lazy: async () => ({
              Component: (await import('@/pages/settings/PrivacySettingsPage')).PrivacySettingsPage,
            }),
          },
          {
            path: 'settings/notifications',
            lazy: async () => ({
              Component: (await import('@/pages/settings/NotificationSettingsPage'))
                .NotificationSettingsPage,
            }),
          },
          {
            path: 'settings/preferences',
            lazy: async () => ({
              Component: (await import('@/pages/settings/PreferencesSettingsPage'))
                .PreferencesSettingsPage,
            }),
          },
          {
            path: 'settings/safety',
            lazy: async () => ({
              Component: (await import('@/pages/settings/SafetySettingsPage')).SafetySettingsPage,
            }),
          },
          {
            path: 'history',
            lazy: async () => ({
              Component: (await import('@/pages/history/BrowsingHistoryPage')).BrowsingHistoryPage,
            }),
          },
        ],
      },
      {
        path: '__dev/states',
        element: <RequireAuth><Outlet /></RequireAuth>,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/pages/system-states/SystemStatesDevPage'))
                .SystemStatesDevPage,
            }),
          },
        ],
      },
      {
        path: '*',
        lazy: async () => ({
          Component: (await import('@/pages/not-found/NotFoundPage')).NotFoundPage,
        }),
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
