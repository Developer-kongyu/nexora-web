import { authHandlers } from './handlers/auth.handlers';
import { feedHandlers } from './handlers/feed.handlers';
import { searchHandlers } from './handlers/search.handlers';
import { postsHandlers } from './handlers/posts.handlers';
import { usersHandlers } from './handlers/users.handlers';
import { mediaHandlers } from './handlers/media.handlers';
import { communitiesHandlers } from './handlers/communities.handlers';
import { libraryHandlers } from './handlers/library.handlers';
import { engagementHandlers } from './handlers/engagement.handlers';
import { notificationsHandlers } from './handlers/notifications.handlers';
import { settingsHandlers } from './handlers/settings.handlers';
import { permissionsHandlers } from './handlers/permissions.handlers';

// Keep this explicit order: static routes must precede matching parameter routes.
export const handlers = [
  ...authHandlers,
  ...feedHandlers,
  ...searchHandlers,
  ...postsHandlers,
  ...usersHandlers,
  ...mediaHandlers,
  ...communitiesHandlers,
  ...libraryHandlers,
  ...engagementHandlers,
  ...notificationsHandlers,
  ...settingsHandlers,
  ...permissionsHandlers,
];
