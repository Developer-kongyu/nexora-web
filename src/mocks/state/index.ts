import { resetFixtureState } from './fixtures.state';
import { resetMediaState } from './media.state';
import { resetUsersState } from './users.state';
import { resetPostsState } from './posts.state';
import { resetCommunitiesState } from './communities.state';
import { resetLibraryState } from './library.state';
import { resetAuthState } from './auth.state';
import { resetNotificationsState } from './notifications.state';
import { resetSettingsState } from './settings.state';
import { resetPermissionsState } from './permissions.state';
import { resetEngagementState } from './engagement.state';

/** MSW resetHandlers only restores routes; rebuild all mutable business data as well. */
export function resetMockState(): void {
  resetFixtureState();
  resetMediaState();
  resetUsersState();
  resetPostsState();
  resetCommunitiesState();
  resetLibraryState();
  resetAuthState();
  resetNotificationsState();
  resetSettingsState();
  resetPermissionsState();
  resetEngagementState();
}
